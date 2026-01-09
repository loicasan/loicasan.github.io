const MAX_STAGES = 10;

//計算機能
function findCombination() {
	let pointTargetElement = document.getElementById('point-target');
	let pointCurrentElement = document.getElementById('point-current');
	let pointRemainingElement = document.getElementById('point-remaining');

	let pointTarget = parseInt(pointTargetElement.value, 10) || 0;
	let pointCurrent = parseInt(pointCurrentElement.value, 10) || 0;
	let targetNumber = pointTarget - pointCurrent;
	pointRemainingElement.value = targetNumber;

	let names = [];
	for (let i = 1; i <= MAX_STAGES; i++) {
		let nameElement = document.getElementById(`stage${i}-name`);
		let nameValue = nameElement ? nameElement.value.trim() : '';
		names.push(nameValue === '' ? `ステージ${i}` : nameValue);
	}

	let numbers = [];
	for (let i = 1; i <= MAX_STAGES; i++) {
		let pointElement = document.getElementById(`stage${i}-point`);
		let pointValue = pointElement ? pointElement.value.trim() : '';
		numbers.push(parseInt(pointValue, 10) || 0);
	}

	let limits = [];
	for (let i = 1; i <= MAX_STAGES; i++) {
		let limitElement = document.getElementById(`stage${i}-limit`);
		let limitValue = limitElement ? limitElement.value.trim() : '';
		let parsedLimit = parseInt(limitValue, 10);
		limits.push(isNaN(parsedLimit) || parsedLimit <= 0 ? Infinity : parsedLimit);
	}

	let currentCombination = new Array(numbers.length).fill(0);

	let timeout = false;
	const startTime = Date.now();
	const maxTime = 5000;

	function backtrack(remaining, index, combination) {
		if (Date.now() - startTime > maxTime) {
			timeout = true;
			return false;
		}
		if (remaining === 0) return true;
		if (remaining < 0 || index === numbers.length) return false;

		const num = numbers[index];
		if (num === 0) {
			return backtrack(remaining, index + 1, combination);
		}
		const maxCount = Math.min(Math.floor(remaining / num), limits[index]);

		for (let count = maxCount; count >= 0; count--) {
			combination[index] = count;
			if (backtrack(remaining - num * count, index + 1, combination)) {
				return true;
			}
		}

		combination[index] = 0;
		return false;
	}

	const tbody = document.getElementById('result').getElementsByTagName('tbody')[0];
	tbody.innerHTML = '';

	if (backtrack(targetNumber, 0, currentCombination)) {
		let hasResults = false;
		for (let i = 0; i < numbers.length; i++) {
			const count = currentCombination[i];
			if (count > 0) {
				hasResults = true;
				const row = tbody.insertRow();
				const stageCell = row.insertCell(0);
				const pointsCell = row.insertCell(1);
				const countCell = row.insertCell(2);
				const inputCell = row.insertCell(3);

				stageCell.textContent = names[i];
				pointsCell.textContent = `${numbers[i]}`;
				pointsCell.id = `progress-point-stage${i + 1}`;
				pointsCell.value = `${numbers[i]}`;
				countCell.textContent = `${count}`;

				const input = document.createElement('input');
				input.type = 'number';
				input.id = `progress-stage${i + 1}`;
				input.className = 'form-control';
				input.style.cssText = 'width:4rem;';
				input.value = 0;
				inputCell.appendChild(input);

				input.addEventListener('change', () => {
					updateProgressTarget();
					calculateProgressAddAndCurrent();
				});
			}
		}
		if (!hasResults && targetNumber === 0) {
			const row = tbody.insertRow();
			const cell = row.insertCell(0);
			cell.colSpan = 4;
			cell.textContent = "目標ポイントに既に到達しています。";
		} else if (!hasResults) {
			const row = tbody.insertRow();
			const cell = row.insertCell(0);
			cell.colSpan = 4;
			cell.textContent = "組み合わせが見つかりましたが、表示する項目がありません。";
		}
	} else {
		const row = tbody.insertRow();
		const cell = row.insertCell(0);
		cell.colSpan = 4;
		if (timeout) {
			cell.innerHTML = "入力された数字に一致する組み合わせが見つかりませんでした。<br>または、計算が時間内に完了しませんでした。目標ポイントとの差が開きすぎているか、組み合わせが複雑すぎるのかもしれません。";
		} else {
			cell.textContent = "入力された数字に一致する組み合わせが見つかりませんでした。";
		}
	}
}

/************************************************************/
//進捗機能
function updateProgressTarget() {
	const pointCurrentElement = document.getElementById('point-current');
	const progressTargetElement = document.getElementById('progress-target');
	const pointCurrent = parseInt(pointCurrentElement.value) || 0;

	if (!Number.isInteger(pointCurrent) || pointCurrent < 0) {
		console.error('point-currentには0以上の整数を入力してください。');
	}
	progressTargetElement.value = pointCurrent;
}
function calculateProgressAddAndCurrent() {
	let progressAdd = 0;
	for (let i = 1; i <= MAX_STAGES; i++) {
		const pointStageElement = document.getElementById(`progress-point-stage${i}`);
		const progressStageElement = document.getElementById(`progress-stage${i}`);
		const pointStageValue = pointStageElement ? parseInt(pointStageElement.value) || 0 : 0;
		const progressStageValue = progressStageElement ? parseInt(progressStageElement.value) || 0 : 0;

		if (!Number.isInteger(pointStageValue) || !Number.isInteger(progressStageValue)) {
			console.error(`数値を入力してください。`);
		}

		progressAdd += pointStageValue * progressStageValue;
	}

	const progressAddElement = document.getElementById('progress-add');
	const progressCurrentElement = document.getElementById('progress-current');

	progressAddElement.value = progressAdd;
	progressCurrentElement.value = parseInt(document.getElementById('point-current').value) + progressAdd;
}

/************************************************************/
//プリセット
document.getElementById('game-name').addEventListener('change', function() {
	var selectedValue = this.value;
	var gameEventSelect = document.getElementById('game-event');

	if (selectedValue === 'free') {
		gameEventSelect.innerHTML = '<option value="free">自由入力</option>';
	} else if (selectedValue === 'mltd') {
		gameEventSelect.innerHTML = '<option value="theater">シアター系</option>' +
									'<option value="anniv">周年</option>' +
									'<option value="tune">チューン</option>' +
									'<option value="tour">ツアー系</option>' +
									'<option value="tale">テール系</option>' +
									'<option value="trust">トラスト</option>' +
									'<option value="treasure">トレジャー</option>';
	}
	var eventValue = gameEventSelect.value;
	loadEventData(selectedValue, eventValue);
});

function loadEventData(selectedValue, eventValue) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'data/' + selectedValue + '-' + eventValue + '.json', true);
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4 && xhr.status === 200) {
			var eventData = JSON.parse(xhr.responseText);
			insertEventData(eventData);
		}
	};
	xhr.send();
}

function insertEventData(eventData) {
	var errors = [];

	function safeGet(data, key, expectedType, defaultValue) {
		if (data.hasOwnProperty(key)) {
			if (expectedType === 'array' && !Array.isArray(data[key])) {
				errors.push(`「${key}」は配列であるべきですが、異なる型でした。`);
				return defaultValue;
			}
			if (typeof data[key] !== expectedType && expectedType !== 'array') {
				errors.push(`「${key}」は${expectedType}であるべきですが、異なる型でした。`);
				return defaultValue;
			}
			return data[key];
		} else {
			errors.push(`「${key}」がデータ内に見つかりません。`);
			return defaultValue;
		}
	}

	document.getElementById('user-name').value = eventData.game_name || '';
	document.getElementById('user-event').value = eventData.event_name || '';
	document.getElementById('user-memo').value = eventData.memo || '';

	var stageNames = eventData.stage_names || [];
	var stagePoints = eventData.stage_points || [];

	for (var i = 0; i < MAX_STAGES; i++) {
		let stageNameInput = document.getElementById('stage' + (i + 1) + '-name');
		let stagePointInput = document.getElementById('stage' + (i + 1) + '-point');

		if (stageNameInput) {
			stageNameInput.value = (typeof stageNames[i] === 'string' || typeof stageNames[i] === 'number') ? stageNames[i] : '';
		} else {
			errors.push(`ステージ${i+1}の名前入力フィールドが見つかりません。`);
		}

		if (stagePointInput) {
			let point = stagePoints[i];
			if (typeof point === 'number' || (typeof point === 'string' && point.trim() !== '')) {
				let parsedPoint = parseInt(point, 10);
				stagePointInput.value = !isNaN(parsedPoint) ? parsedPoint : ''; 
			} else if (point === null || point === undefined) {
				stagePointInput.value = '';
			} else {
				stagePointInput.value = '';
				errors.push(`ステージ${i+1}のポイント「${point}」は有効な数値ではありません。`);
			}
		} else {
			errors.push(`ステージ${i+1}のポイント入力フィールドが見つかりません。`);
		}
	}

	if (errors.length > 0) {
		alert("データ読み込み中に以下の問題が発生しました:\n- " + errors.join("\n- ") + "\n\n一部のデータが正しく読み込まれなかった可能性があります。");
	}
}

document.getElementById('game-event').addEventListener('change', function() {
	var selectedValue = document.getElementById('game-name').value;
	var eventValue = this.value;
	loadEventData(selectedValue, eventValue);
});

window.addEventListener('load', function() {
	var selectedValue = document.getElementById('game-name').value;
	var eventValue = document.getElementById('game-event').value;
	loadEventData(selectedValue, eventValue);
});
// 保存
function saveUserdata() {
	var userData = {
		game_name: document.getElementById('user-name').value,
		event_name: document.getElementById('user-event').value,
		stage_names: [],
		stage_points: [],
		memo: document.getElementById('user-memo').value
	};

	for (var i = 0; i < MAX_STAGES; i++) {
		userData.stage_names.push(document.getElementById('stage' + (i + 1) + '-name').value);
		userData.stage_points.push(parseInt(document.getElementById('stage' + (i + 1) + '-point').value, 10));
	}

	var jsonString = JSON.stringify(userData, null, 2);

	var blob = new Blob([jsonString], { type: "application/json" });
	var url = URL.createObjectURL(blob);
	var a = document.createElement('a');
	a.href = url;
	a.download = 'nantonaku-eventpt-adjustment-userdata.json';
	a.click();
	URL.revokeObjectURL(url);
}
// ロード
function openUserdata(event) {
	var file = event.target.files[0];
	if (!file) {
		return;
	}

	var reader = new FileReader();
	reader.onload = function(e) {
		try {
			var eventData = JSON.parse(e.target.result);

			if (typeof eventData !== 'object' || eventData === null) {
				alert("無効なファイル形式です。JSONオブジェクトではありません。");
				return;
			}

			eventData.game_name = typeof eventData.game_name === 'string' ? eventData.game_name : '';
			eventData.event_name = typeof eventData.event_name === 'string' ? eventData.event_name : '';
			eventData.memo = typeof eventData.memo === 'string' ? eventData.memo : '';

			if (!Array.isArray(eventData.stage_names)) {
				alert("無効なデータ形式です。「stage_names」は配列である必要があります。");
				return;
			}
			if (!Array.isArray(eventData.stage_points)) {
				alert("無効なデータ形式です。「stage_points」は配列である必要があります。");
				return;
			}

			insertEventData(eventData);
		} catch (error) {
			alert("無効なファイルです。内容を読み取れませんでした: " + error.message);
		}
	};
	reader.onerror = function() {
		alert("ファイルの読み取り中にエラーが発生しました。");
	};
	reader.readAsText(file);
}

// ファイル入力のchangeイベントにopenUserdata関数を設定
document.getElementById('file-input').addEventListener('change', openUserdata);