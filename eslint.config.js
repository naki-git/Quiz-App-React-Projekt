import globals from 'globals';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactQuery from '@tanstack/eslint-plugin-query';

// https://eslint.org/docs/latest/use/configure/configuration-files-new
export default [
	...reactQuery.configs['flat/recommended'],
	{
		languageOptions: {
			parserOptions: {
				ecmaFeatures: { jsx: true }, // Erlaubt JSX, also React-Code
			},
			globals: {
				/* 	Erlaube globale Werte wie window, die im Browser
				existieren, aber nicht zu JS selbst gehören.  */
				...globals.browser,
			},
		},
		files: ['**/*.{js,jsx,ts,tsx,cjs}'],
		ignores: ['dist'], // Ignoriere kompiliertes JS
		settings: {
			react: {
				version: 'detect', // React-Version wird automatisch ermittelt
			},
		},
		rules: {
			// Empfohlene Regeln aus Plugins aktivieren
			...js.configs.recommended.rules,
			...react.configs.recommended.rules,
			...react.configs['jsx-runtime'].rules,
			...reactHooks.configs.recommended.rules,
			...jsxA11y.configs.recommended.rules,

			/* 	Am Ende kann man selbst einzelne Regeln an- oder abschalten
			Übersicht zu den JavaScript-Regeln: https://eslint.org/docs/rules/ */
			'no-var': 'error', // "off", "warn" oder "error", alternativ 0,1 oder 2
			'prefer-const': 'error',
			'object-shorthand': 'warn',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'react/jsx-no-target-blank': 'off',
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			'react/no-unknown-property': ['error', { ignore: ['xyz'] }],
		},
		/* Schlüsselname ist so wie der Teil nach eslint-plugin- im Modulname. */
		plugins: {
			react,
			'react-hooks': reactHooks,
			'jsx-a11y': jsxA11y,
			'react-refresh': reactRefresh,
		},
	},
];
