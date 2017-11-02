/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

class ModelConverterBuilder {
	constructor() {
		this._dispatchers = [];
		this._utils = [];
	}

	for( ...dispatchers ) {
		this._dispatchers = dispatchers;

		return this;
	}

	use( utilityFn ) {
		for( const dispatcher of this._dispatchers ) {
			utilityFn( dispatcher );
		}

		return this;
	}
}

export default function buildModelConverter() {
	return new ModelConverterBuilder();
}

