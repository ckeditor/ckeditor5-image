/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ViewContainerElement from '@ckeditor/ckeditor5-engine/src/view/containerelement';
import { eventNameToConsumableType } from '@ckeditor/ckeditor5-engine/src/conversion/model-to-view-converters';
import ViewAttributeElement from '@ckeditor/ckeditor5-engine/src/view/attributeelement';
import ViewElement from '@ckeditor/ckeditor5-engine/src/view/element';
import viewWriter from '@ckeditor/ckeditor5-engine/src/view/writer';
import {
	insertUIElement,
	setAttribute,
	removeAttribute,
	removeUIElement,
	wrapItem,
	unwrapItem,
	highlightText,
	highlightElement
} from '@ckeditor/ckeditor5-engine/src/conversion/model-to-view-converters';
import { convertSelectionAttribute, convertSelectionMarker } from '@ckeditor/ckeditor5-engine/src/conversion/model-selection-to-view-converters';

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

export function buildModelConverter() {
	return new ModelConverterBuilder();
}

export function elementToElement( modelElementName, viewElement, options = {} ) {
	options = Object.assign({}, { priority: 'normal', insertAtStart: true }, options );
	viewElement = typeof viewElement == 'string' ? new ViewContainerElement( viewElement ) : viewElement;

	return dispatcher => {
		dispatcher.on( 'insert:' + modelElementName, insertElement( viewElement, options ), { priority: options.priority } );
	}
}

export function insertElement( elementCreator, options ) {
	return ( evt, data, consumable, conversionApi ) => {
		const modelElement = data.item;

		if ( options.filter && !options.filter( modelElement ) ) {
			return;
		}

		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data, consumable, conversionApi );

		if ( !viewElement ) {
			return;
		}

		if ( !consumable.consume( modelElement, 'insert' ) ) {
			return;
		}

		const modelPosition = data.range.start;
		let viewPosition = conversionApi.mapper.toViewPosition( modelPosition );

		if ( options.insertPosition ) {
			viewPosition = options.insertPosition( viewPosition )
		}

		conversionApi.mapper.bindElements( modelElement, viewElement );
		viewWriter.insert( viewPosition, viewElement );
	};
}

export function attributeToChildElementAttribute( modelElement, modelAttribute, viewChildElement, customFn ) {
	return dispatcher => {
		// TODO: priority
		dispatcher.on( `addAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
		dispatcher.on( `changeAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
		dispatcher.on( `removeAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
	};
}

export function attributeToAttribute( elementName, attributeName, options ) {
	options = Object.assign({}, { priority: 'normal' }, options );

	return dispatcher => {
		dispatcher.on( `addAttribute:${ attributeName }:${ elementName }`, updateAttribute(), { priority: options.priority } );
		dispatcher.on( `changeAttribute:${ attributeName }:${ elementName }`, updateAttribute(), { priority: options.priority } );
		dispatcher.on( `removeAttribute:${ attributeName }:${ elementName }`, updateAttribute(), { priority: options.priority } );
	};
}

export function updateAttribute( attributeCreator ) {
	attributeCreator = attributeCreator || ( ( value, key ) => ( { value, key } ) );

	return ( evt, data, consumable, conversionApi ) => {
		const parts = evt.name.split( ':' );

		if ( !consumable.consume( data.item, eventNameToConsumableType( evt.name ) ) ) {
			return;
		}


		const viewElement = conversionApi.mapper.toViewElement( data.item );
		const type = parts[ 0 ];

		if ( type === 'removeAttribute' ) {
			const { key, value } = attributeCreator( data.attributeNewValue, data.attributeKey, data, consumable, conversionApi );
			viewElement.setAttribute( key, value );
		} else {
			const { key } = attributeCreator( data.attributeOldValue, data.attributeKey, data, consumable, conversionApi );
			viewElement.removeAttribute( key );
		}
	};
}

function modelToViewChildAttributeConverter( viewChildElement, customFn ) {
	return ( evt, data, consumable, conversionApi ) => {
		const parts = evt.name.split( ':' );
		const consumableType = parts[ 0 ] + ':' + parts[ 1 ];
		const modelElement = data.item;

		if ( !consumable.consume( modelElement, consumableType ) ) {
			return;
		}

		const viewElement = conversionApi.mapper.toViewElement( modelElement );
		let viewChild;

		for ( const child of viewElement.getChildren() ) {
			if ( child.name == viewChildElement ) {
				viewChild = child;
			}
		}

		if ( !viewChild ) {
			return;
		}

		const type = parts[ 0 ];

		if ( customFn ) {
			customFn( type, viewChild, data );
		} else {
			if ( type == 'removeAttribute' ) {
				viewChild.removeAttribute( data.attributeKey );
			} else {
				viewChild.setAttribute( data.attributeKey, data.attributeNewValue );
			}
		}
	};
}

