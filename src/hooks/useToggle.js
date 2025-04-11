import { useCallback, useState } from 'react';

export function useToggle(initialState) {
	const [state, setState] = useState(initialState);

	const toggle = useCallback(
		() => setState((currentState) => !currentState),
		[]
	);

	const setTrue = useCallback(() => setState(true), []);
	const setFalse = useCallback(() => setState(false), []);
	const reset = useCallback(() => setState(initialState), [initialState]);

	return [state, toggle, setState, setTrue, setFalse, reset];
}
