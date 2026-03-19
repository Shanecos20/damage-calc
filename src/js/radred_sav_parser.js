/**
 * Radical Red 4.1 / GBA save party parser (logic mirrored from radred_team_extractor.py).
 * Depends on window.RADRED_SAV_DATA from ./data/radred_sav_data.js
 */
(function () {
	'use strict';

	var SECTION_SIZE = 0x1000;
	var NUM_SECTIONS = 14;
	var SECTION_ID_OFFSET = 0x0ff4;
	var SIGNATURE_OFFSET = 0x0ff8;
	var SAVE_INDEX_OFFSET = 0x0ffc;
	var SIGNATURE = 0x08012025;
	var PARTY_OFFSET = 0x0038;
	var POKEMON_ENTRY_SIZE = 100;
	var POKEMON_PARTY_SIZE = 6;
	var SAVE_FILE_SIZE = 128 * 1024;

	var NATURES = [
		'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
		'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
		'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
	];

	function readU16(u8, off) {
		return u8[off] | (u8[off + 1] << 8);
	}

	function readU32(u8, off) {
		return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
	}

	function getNameBySpeciesId(speciesId) {
		var data = window.RADRED_SAV_DATA;
		if (!data || !data.species) throw new Error('Rad Red save data not loaded');
		if (speciesId < 1 || speciesId > data.species.length) {
			return 'Species #' + speciesId;
		}
		return String(data.species[speciesId - 1] || '').trim();
	}

	function getMoveById(moveId) {
		var data = window.RADRED_SAV_DATA;
		if (!moveId || moveId < 1 || moveId > data.moves.length) {
			return '(No Move)';
		}
		return String(data.moves[moveId - 1] || '').trim() || '(No Move)';
	}

	function getItemById(itemId) {
		if (itemId === 0) return 'None';
		var data = window.RADRED_SAV_DATA;
		if (itemId < 1 || itemId > data.items.length) return 'None';
		return String(data.items[itemId - 1] || '').trim() || 'None';
	}

	function getAbility(species, abilityType) {
		var data = window.RADRED_SAV_DATA;
		var row = data.abilityBySpecies[species];
		if (!row) return 'Species not found';
		if (abilityType === '1') return row.primary;
		if (abilityType === '2') return row.secondary;
		if (abilityType === 'h') {
			return row.hidden ? row.hidden : 'No hidden ability';
		}
		return 'Invalid ability type';
	}

	function decodeNickname(entry) {
		var chars = window.RADRED_SAV_DATA.nicknameChars;
		var s = '';
		for (var i = 8; i < 18; i++) {
			var b = entry[i];
			s += chars[b] !== undefined ? chars[b] : ' ';
		}
		return s.replace(/\0/g, '').replace(/ +$/g, '').trim();
	}

	function parsePokemonEntry(entry) {
		var personalId = readU32(entry, 0);
		var speciesId = readU16(entry, 32);
		var species = getNameBySpeciesId(speciesId);
		var level = entry[84];
		var heldItemId = getItemById(readU16(entry, 34));
		var nickname = decodeNickname(entry);

		var evHp = entry[56];
		var evAttack = entry[57];
		var evDefense = entry[58];
		var evSpeed = entry[59];
		var evSpa = entry[60];
		var evSpd = entry[61];

		var ivsData = readU32(entry, 72);
		var ivHp = ivsData & 0x1f;
		var ivAtk = (ivsData >> 5) & 0x1f;
		var ivDef = (ivsData >> 10) & 0x1f;
		var ivSpe = (ivsData >> 15) & 0x1f;
		var ivSpa = (ivsData >> 20) & 0x1f;
		var ivSpd = (ivsData >> 25) & 0x1f;
		var isEgg = (ivsData >> 30) & 0x01;
		var abilityFlag = (ivsData >> 31) & 0x01;

		var abilityKey;
		if (abilityFlag !== 1) {
			abilityKey = personalId % 2 === 0 ? '1' : '2';
		} else {
			abilityKey = 'h';
		}
		var ability = getAbility(species, abilityKey);

		var m1 = getMoveById(readU16(entry, 44));
		var m2 = getMoveById(readU16(entry, 46));
		var m3 = getMoveById(readU16(entry, 48));
		var m4 = getMoveById(readU16(entry, 50));

		var nature = NATURES[personalId % 25];

		return {
			species: species,
			speciesId: speciesId,
			level: level,
			held_item_id: heldItemId,
			nickname: nickname,
			ev_hp: evHp,
			ev_attack: evAttack,
			ev_defense: evDefense,
			ev_speed: evSpeed,
			ev_special_attack: evSpa,
			ev_special_defense: evSpd,
			iv_hp: ivHp,
			iv_attack: ivAtk,
			iv_defense: ivDef,
			iv_speed: ivSpe,
			iv_special_attack: ivSpa,
			iv_special_defense: ivSpd,
			is_egg: !!isEgg,
			ability: ability,
			move1: m1,
			move2: m2,
			move3: m3,
			move4: m4,
			nature: nature,
		};
	}

	function readParty(arrayBuffer) {
		if (!window.RADRED_SAV_DATA) {
			throw new Error('Rad Red save data not loaded. Rebuild the calculator.');
		}
		if (arrayBuffer.byteLength !== SAVE_FILE_SIZE) {
			throw new Error('Invalid save file size: expected 128 KB (standard GBA / Radical Red .sav).');
		}
		var sav = new Uint8Array(arrayBuffer);
		var sections = [];
		for (var saveBlock = 0; saveBlock < 2; saveBlock++) {
			for (var sectionIndex = 0; sectionIndex < NUM_SECTIONS; sectionIndex++) {
				var offset = saveBlock * NUM_SECTIONS * SECTION_SIZE + sectionIndex * SECTION_SIZE;
				var section = sav.subarray(offset, offset + SECTION_SIZE);
				var sectionId = readU16(section, SECTION_ID_OFFSET);
				var signature = readU32(section, SIGNATURE_OFFSET);
				var saveIndex = readU16(section, SAVE_INDEX_OFFSET);
				if (sectionId === 0x01 && signature === SIGNATURE) {
					sections.push({ saveIndex: saveIndex, section: section });
				}
			}
		}
		if (!sections.length) {
			throw new Error('No valid save sections found. Use a Radical Red 4.1 .sav from the same release as this tool.');
		}
		var latest = sections[0];
		for (var s = 1; s < sections.length; s++) {
			if (sections[s].saveIndex > latest.saveIndex) latest = sections[s];
		}
		var latestSection = latest.section;
		var partyData = latestSection.subarray(PARTY_OFFSET, PARTY_OFFSET + POKEMON_ENTRY_SIZE * POKEMON_PARTY_SIZE);

		var party = [];
		for (var i = 0; i < POKEMON_PARTY_SIZE; i++) {
			var entry = partyData.subarray(i * POKEMON_ENTRY_SIZE, (i + 1) * POKEMON_ENTRY_SIZE);
			if (entry[0] === 0) break;
			var mon = parsePokemonEntry(entry);
			if (mon.is_egg) continue;
			if (!mon.speciesId) break;
			party.push(mon);
		}
		return party;
	}

	window.RadRedSav = { readParty: readParty };
})();
