import { useState, useCallback } from 'react';

export function useCount(max, initialValue = 0, min = 0, step = 1) {
	checkValidNumber(initialValue, min, max);

	const [count, setCount] = useState(initialValue);

	const increment = useCallback(
		() => setCount(Math.min(count + step, max)),
		[count, max, step]
	);
	const decrement = useCallback(
		() => setCount(Math.max(count - step, min)),
		[count, min, step]
	);
	const reset = useCallback(() => setCount(initialValue), [initialValue]);

	const isMin = count === min;
	const isMax = count === max;

	function safeSetCount(value) {
		checkValidNumber(value);
		setCount(value);
	}

	return {
		count,
		increment,
		decrement,
		reset,
		isMin,
		isMax,
		setCount: safeSetCount,
	};
}

/* Wenn number keine Zahl ist oder number außerhalb von min und max
liegt, soll die Funktion einen Fehler werfen. */
function checkValidNumber(number, min, max) {
	if (typeof number !== 'number' || Number.isNaN(number)) {
		throw new Error(`${number} ist keine gültige Zahl.`);
	}

	// Man könnte noch Infinity prüfen
	// Man könnte prüfen, ob min kleiner oder gleich wie max ist
	// Man müsste auch noch prüfen, ob min, max und step gültige Zahlen sind

	if (number > max || number < min) {
		throw new Error(
			`${number} ist nicht im erlaubten Bereich von ${min} bis ${max}`
		);
	}
}
