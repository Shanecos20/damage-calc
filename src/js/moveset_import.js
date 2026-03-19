function radredAbilityForCalc(species, gameAbility) {
	if (calc.ABILITIES[9].indexOf(gameAbility) !== -1) return gameAbility;
	var data = window.RADRED_SAV_DATA;
	if (!data || !data.abilityBySpecies) return gameAbility;
	var row = data.abilityBySpecies[species];
	if (!row) return gameAbility;
	if (calc.ABILITIES[9].indexOf(row.primary) !== -1) return row.primary;
	if (calc.ABILITIES[9].indexOf(row.secondary) !== -1) return row.secondary;
	if (row.hidden && calc.ABILITIES[9].indexOf(row.hidden) !== -1) return row.hidden;
	return row.primary || gameAbility;
}

function radredPartyToPaste(party) {
	var lines = [];
	for (var i = 0; i < party.length; i++) {
		var p = party[i];
		var nick = (p.nickname || '').replace(/\s+/g, ' ').trim();
		var speciesLine = nick && nick.toLowerCase() !== (p.species || '').toLowerCase()
			? nick + ' (' + p.species + ')'
			: p.species;
		if (p.held_item_id && p.held_item_id !== 'None') {
			speciesLine += ' @ ' + p.held_item_id;
		}
		lines.push(speciesLine);
		lines.push('Ability: ' + radredAbilityForCalc(p.species, p.ability));
		lines.push('Level: ' + p.level);
		lines.push('EVs: ' + p.ev_hp + ' HP / ' + p.ev_attack + ' Atk / ' + p.ev_defense + ' Def / ' + p.ev_speed + ' Spe / ' + p.ev_special_attack + ' SpA / ' + p.ev_special_defense + ' SpD');
		lines.push(p.nature + ' Nature');
		lines.push('IVs: ' + p.iv_hp + ' HP / ' + p.iv_attack + ' Atk / ' + p.iv_defense + ' Def / ' + p.iv_speed + ' Spe / ' + p.iv_special_attack + ' SpA / ' + p.iv_special_defense + ' SpD');
		var moves = [p.move1, p.move2, p.move3, p.move4];
		for (var m = 0; m < moves.length; m++) {
			if (moves[m] && moves[m] !== '(No Move)') {
				lines.push('- ' + moves[m]);
			}
		}
		lines.push('');
	}
	return lines.join('\n').trim();
}

function placeBsBtn() {
	var fileInput = '<input type="file" id="radredSavFile" class="visually-hidden" accept=".sav,.SAV,application/octet-stream,*/*" aria-label="Select Radical Red save file" />';
	var uploadBtn = '<button type="button" id="uploadSavTeam" class="bs-btn bs-btn-default" title="128 KB Radical Red 4.1 save — works on mobile when you pick &quot;Browse&quot; / All Files">Upload team (.sav)</button>';
	var importBtn = "<button type=\"button\" id='import' class='bs-btn bs-btn-default'>Import</button>";
	$("#import-1_wrapper").append(fileInput + uploadBtn + importBtn);

	$("#uploadSavTeam").on("click", function () {
		document.getElementById("radredSavFile").click();
	});

	$("#radredSavFile").on("change", function (e) {
		var f = e.target.files && e.target.files[0];
		if (!f) return;
		if (!window.RadRedSav || !window.RADRED_SAV_DATA) {
			alert("Save importer is not loaded. Refresh the page or rebuild the calculator.");
			e.target.value = "";
			return;
		}
		var reader = new FileReader();
		reader.onload = function () {
			try {
				var party = window.RadRedSav.readParty(reader.result);
				if (!party.length) {
					alert("No Pokémon found in party (or only eggs).");
					e.target.value = "";
					return;
				}
				var text = radredPartyToPaste(party);
				document.getElementsByClassName("import-team-text")[0].value = text;
				var nameField = document.getElementsByClassName("import-name-text")[0].value.trim();
				var setName = nameField === "" || nameField === "Custom Set" ? "Rad Red Save" : nameField;
				addSets(text, setName);
			} catch (err) {
				alert(err && err.message ? err.message : String(err));
			}
			e.target.value = "";
		};
		reader.onerror = function () {
			alert("Could not read that file.");
			e.target.value = "";
		};
		reader.readAsArrayBuffer(f);
	});

	$("#import.bs-btn").click(function () {
		var pokes = document.getElementsByClassName("import-team-text")[0].value;
		var name = document.getElementsByClassName("import-name-text")[0].value.trim() === "" ? "Custom Set" : document.getElementsByClassName("import-name-text")[0].value;
		addSets(pokes, name);
	});
}

function ExportPokemon(pokeInfo) {
	var pokemon = createPokemon(pokeInfo);
	var EV_counter = 0;
	var finalText = "";
	finalText = pokemon.name + (pokemon.item ? " @ " + pokemon.item : "") + "\n";
	finalText += "Level: " + pokemon.level + "\n";
	finalText += pokemon.nature && gen > 2 ? pokemon.nature + " Nature" + "\n" : "";
	if (gen === 9) {
		var teraType = pokeInfo.find(".teraType").val();
		if (teraType !== undefined && teraType !== pokemon.types[0]) {
			finalText += "Tera Type: " + teraType + "\n";
		}
	}
	finalText += pokemon.ability ? "Ability: " + pokemon.ability + "\n" : "";
	if (gen > 2) {
		var EVs_Array = [];
		for (var stat in pokemon.evs) {
			var ev = pokemon.evs[stat] ? pokemon.evs[stat] : 0;
			if (ev > 0) {
				EVs_Array.push(ev + " " + calc.Stats.displayStat(stat));
			}
			EV_counter += ev;
			if (EV_counter > 510) break;
		}
		if (EVs_Array.length > 0) {
			finalText += "EVs: ";
			finalText += serialize(EVs_Array, " / ");
			finalText += "\n";
		}
	}

	var IVs_Array = [];
	for (var stat in pokemon.ivs) {
		var iv = pokemon.ivs[stat] ? pokemon.ivs[stat] : 0;
		if (iv < 31) {
			IVs_Array.push(iv + " " + calc.Stats.displayStat(stat));
		}
	}
	if (IVs_Array.length > 0) {
		finalText += "IVs: ";
		finalText += serialize(IVs_Array, " / ");
		finalText += "\n";
	}

	for (var i = 0; i < 4; i++) {
		var moveName = pokemon.moves[i].name;
		if (moveName !== "(No Move)") {
			finalText += "- " + moveName + "\n";
		}
	}
	finalText = finalText.trim();
	$("textarea.import-team-text").val(finalText);
}

$("#exportL").click(function () {
	ExportPokemon($("#p1"));
});

$("#exportR").click(function () {
	ExportPokemon($("#p2"));
});

function serialize(array, separator) {
	var text = "";
	for (var i = 0; i < array.length; i++) {
		if (i < array.length - 1) {
			text += array[i] + separator;
		} else {
			text += array[i];
		}
	}
	return text;
}

function getAbility(row) {
	var ability = row[1] ? row[1].trim() : '';
	if (calc.ABILITIES[9].indexOf(ability) !== -1) return ability;
}

function getTeraType(row) {
	var teraType = row[1] ? row[1].trim() : '';
	if (Object.keys(calc.TYPE_CHART[9]).slice(1).indexOf(teraType) !== -1) return teraType;
}

function statToLegacyStat(stat) {
	switch (stat) {
	case 'hp':
		return "hp";
	case 'atk':
		return "at";
	case 'def':
		return "df";
	case 'spa':
		return "sa";
	case 'spd':
		return "sd";
	case 'spe':
		return "sp";
	}
}

function getStats(currentPoke, rows, offset) {
	currentPoke.nature = "Serious";
	var currentEV;
	var currentIV;
	var currentAbility;
	var currentTeraType;
	var currentNature;
	currentPoke.level = 100;
	for (var x = offset; x < offset + 9; x++) {
		var currentRow = rows[x] ? rows[x].split(/[/:]/) : '';
		var evs = {};
		var ivs = {};
		var ev;
		var j;

		switch (currentRow[0]) {
		case 'Level':
			currentPoke.level = parseInt(currentRow[1].trim());
			break;
		case 'EVs':
			for (j = 1; j < currentRow.length; j++) {
				currentEV = currentRow[j].trim().split(" ");
				currentEV[1] = statToLegacyStat(currentEV[1].toLowerCase());
				evs[currentEV[1]] = parseInt(currentEV[0]);
			}
			currentPoke.evs = evs;
			break;
		case 'IVs':
			for (j = 1; j < currentRow.length; j++) {
				currentIV = currentRow[j].trim().split(" ");
				currentIV[1] = statToLegacyStat(currentIV[1].toLowerCase());
				ivs[currentIV[1]] = parseInt(currentIV[0]);
			}
			currentPoke.ivs = ivs;
			break;

		}
		currentAbility = rows[x] ? rows[x].trim().split(":") : '';
		if (currentAbility[0] == "Ability") {
			currentPoke.ability = currentAbility[1].trim();
		}

		currentTeraType = rows[x] ? rows[x].trim().split(":") : '';
		if (currentTeraType[0] == "Tera Type") {
			currentPoke.teraType = currentTeraType[1].trim();
		}

		currentNature = rows[x] ? rows[x].trim().split(" ") : '';
		if (currentNature[1] == "Nature") {
			currentPoke.nature = currentNature[0];
		}
	}
	return currentPoke;
}

function getItem(currentRow, j) {
	for (;j < currentRow.length; j++) {
		var item = currentRow[j].trim();
		if (calc.ITEMS[9].indexOf(item) != -1) {
			return item;
		}
	}
}

function getMoves(currentPoke, rows, offset) {
	var movesFound = false;
	var moves = [];
	for (var x = offset; x < offset + 12; x++) {
		if (rows[x]) {
			if (rows[x][0] == "-") {
				movesFound = true;
				var move = rows[x].substr(2, rows[x].length - 2).replace("[", "").replace("]", "").replace("  ", "");
				moves.push(move);
			} else {
				if (movesFound == true) {
					break;
				}
			}
		}
	}
	currentPoke.moves = moves;
	return currentPoke;
}

function addToDex(poke) {
	var dexObject = {};
	if ($("#randoms").prop("checked")) {
		if (GEN9RANDOMBATTLE[poke.name] == undefined) GEN9RANDOMBATTLE[poke.name] = {};
		if (GEN8RANDOMBATTLE[poke.name] == undefined) GEN8RANDOMBATTLE[poke.name] = {};
		if (GEN7RANDOMBATTLE[poke.name] == undefined) GEN7RANDOMBATTLE[poke.name] = {};
		if (GEN6RANDOMBATTLE[poke.name] == undefined) GEN6RANDOMBATTLE[poke.name] = {};
		if (GEN5RANDOMBATTLE[poke.name] == undefined) GEN5RANDOMBATTLE[poke.name] = {};
		if (GEN4RANDOMBATTLE[poke.name] == undefined) GEN4RANDOMBATTLE[poke.name] = {};
		if (GEN3RANDOMBATTLE[poke.name] == undefined) GEN3RANDOMBATTLE[poke.name] = {};
		if (GEN2RANDOMBATTLE[poke.name] == undefined) GEN2RANDOMBATTLE[poke.name] = {};
		if (GEN1RANDOMBATTLE[poke.name] == undefined) GEN1RANDOMBATTLE[poke.name] = {};
	} else {
		if (SETDEX_SV[poke.name] == undefined) SETDEX_SV[poke.name] = {};
		if (SETDEX_SS[poke.name] == undefined) SETDEX_SS[poke.name] = {};
		if (SETDEX_SM[poke.name] == undefined) SETDEX_SM[poke.name] = {};
		if (SETDEX_XY[poke.name] == undefined) SETDEX_XY[poke.name] = {};
		if (SETDEX_BW[poke.name] == undefined) SETDEX_BW[poke.name] = {};
		if (SETDEX_DPP[poke.name] == undefined) SETDEX_DPP[poke.name] = {};
		if (SETDEX_ADV[poke.name] == undefined) SETDEX_ADV[poke.name] = {};
		if (SETDEX_GSC[poke.name] == undefined) SETDEX_GSC[poke.name] = {};
		if (SETDEX_RBY[poke.name] == undefined) SETDEX_RBY[poke.name] = {};
	}
	if (poke.ability !== undefined) {
		dexObject.ability = poke.ability;
	}
	if (poke.teraType !== undefined) {
		dexObject.teraType = poke.teraType;
	}
	dexObject.level = poke.level;
	dexObject.evs = poke.evs;
	dexObject.ivs = poke.ivs;
	dexObject.moves = poke.moves;
	dexObject.nature = poke.nature;
	dexObject.item = poke.item;
	dexObject.isCustomSet = poke.isCustomSet;
	var customsets;
	if (localStorage.customsets) {
		customsets = JSON.parse(localStorage.customsets);
	} else {
		customsets = {};
	}
	if (!customsets[poke.name]) {
		customsets[poke.name] = {};
	}
	customsets[poke.name][poke.nameProp] = dexObject;
	if (poke.name === "Aegislash-Blade") {
		if (!customsets["Aegislash-Shield"]) {
			customsets["Aegislash-Shield"] = {};
		}
		customsets["Aegislash-Shield"][poke.nameProp] = dexObject;
	}
	updateDex(customsets);
}

function updateDex(customsets) {
	for (var pokemon in customsets) {
		for (var moveset in customsets[pokemon]) {
			if (!SETDEX_SV[pokemon]) SETDEX_SV[pokemon] = {};
			SETDEX_SV[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_SS[pokemon]) SETDEX_SS[pokemon] = {};
			SETDEX_SS[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_SM[pokemon]) SETDEX_SM[pokemon] = {};
			SETDEX_SM[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_XY[pokemon]) SETDEX_XY[pokemon] = {};
			SETDEX_XY[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_BW[pokemon]) SETDEX_BW[pokemon] = {};
			SETDEX_BW[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_DPP[pokemon]) SETDEX_DPP[pokemon] = {};
			SETDEX_DPP[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_ADV[pokemon]) SETDEX_ADV[pokemon] = {};
			SETDEX_ADV[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_GSC[pokemon]) SETDEX_GSC[pokemon] = {};
			SETDEX_GSC[pokemon][moveset] = customsets[pokemon][moveset];
			if (!SETDEX_RBY[pokemon]) SETDEX_RBY[pokemon] = {};
			SETDEX_RBY[pokemon][moveset] = customsets[pokemon][moveset];
		}
	}
	localStorage.customsets = JSON.stringify(customsets);
}

function addSets(pokes, name) {
	var rows = pokes.split("\n");
	var currentRow;
	var currentPoke;
	var addedpokes = 0;
	for (var i = 0; i < rows.length; i++) {
		currentRow = rows[i].split(/[()@]/);
		for (var j = 0; j < currentRow.length; j++) {
			currentRow[j] = checkExeptions(currentRow[j].trim());
			if (calc.SPECIES[9][currentRow[j].trim()] !== undefined) {
				currentPoke = calc.SPECIES[9][currentRow[j].trim()];
				currentPoke.name = currentRow[j].trim();
				currentPoke.item = getItem(currentRow, j + 1);
				if (j === 1 && currentRow[0].trim()) {
					currentPoke.nameProp = currentRow[0].trim();
				} else {
					currentPoke.nameProp = name;
				}
				currentPoke.isCustomSet = true;
				currentPoke.ability = getAbility(rows[i + 1].split(":"));
				currentPoke.teraType = getTeraType(rows[i + 1].split(":"));
				currentPoke = getStats(currentPoke, rows, i + 1);
				currentPoke = getMoves(currentPoke, rows, i);
				addToDex(currentPoke);
				addedpokes++;
			}
		}
	}
	if (addedpokes > 0) {
		alert("Successfully imported " + addedpokes + " set(s)");
		$(allPokemon("#importedSetsOptions")).css("display", "inline");
	} else {
		alert("No sets imported, please check your syntax and try again");
	}
}

function checkExeptions(poke) {
	switch (poke) {
	case 'Aegislash':
		poke = "Aegislash-Blade";
		break;
	case 'Basculin-Blue-Striped':
		poke = "Basculin";
		break;
	case 'Gastrodon-East':
		poke = "Gastrodon";
		break;
	case 'Mimikyu-Busted-Totem':
		poke = "Mimikyu-Totem";
		break;
	case 'Mimikyu-Busted':
		poke = "Mimikyu";
		break;
	case 'Pikachu-Belle':
	case 'Pikachu-Cosplay':
	case 'Pikachu-Libre':
	case 'Pikachu-Original':
	case 'Pikachu-Partner':
	case 'Pikachu-PhD':
	case 'Pikachu-Pop-Star':
	case 'Pikachu-Rock-Star':
		poke = "Pikachu";
		break;
	case 'Vivillon-Fancy':
	case 'Vivillon-Pokeball':
		poke = "Vivillon";
		break;
	case 'Florges-White':
	case 'Florges-Blue':
	case 'Florges-Orange':
	case 'Florges-Yellow':
		poke = "Florges";
		break;
	case 'Shellos-East':
		poke = "Shellos";
		break;
	case 'Deerling-Summer':
	case 'Deerling-Autumn':
	case 'Deerling-Winter':
		poke = "Deerling";
		break;
	}
	return poke;

}

$(allPokemon("#clearSets")).click(function () {
	if (confirm("Are you sure you want to delete your custom sets? This action cannot be undone.")) {
		localStorage.removeItem("customsets");
		alert("Custom Sets successfully cleared. Please refresh the page.");
		$(allPokemon("#importedSetsOptions")).hide();
		loadDefaultLists();
	}
});

$(allPokemon("#importedSets")).click(function () {
	var pokeID = $(this).parent().parent().prop("id");
	var showCustomSets = $(this).prop("checked");
	if (showCustomSets) {
		loadCustomList(pokeID);
	} else {
		loadDefaultLists();
	}
});

$(document).ready(function () {
	var customSets;
	placeBsBtn();
	if (localStorage.customsets) {
		customSets = JSON.parse(localStorage.customsets);
		updateDex(customSets);
		$(allPokemon("#importedSetsOptions")).css("display", "inline");
	} else {
		loadDefaultLists();
	}
});
