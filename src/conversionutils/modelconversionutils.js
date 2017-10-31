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
	options = Object.assign({}, { priority: 'normal' }, options );
	viewElement = typeof viewElement == 'string' ? new ViewContainerElement( viewElement ) : viewElement;

	return dispatcher => {
		dispatcher.on( 'insert:' + modelElementName, insertElement( viewElement, options.filter ), { priority: options.priority } );
	}
}

/**
 * Function factory, creates a converter that converts node insertion changes from the model to the view.
 * The view element that will be added to the view depends on passed parameter. If {@link module:engine/view/element~Element} was passed,
 * it will be cloned and the copy will be inserted. If `Function` is provided, it is passed all the parameters of the
 * dispatcher's {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:insert insert event}.
 * It's expected that the function returns a {@link module:engine/view/element~Element}.
 * The result of the function will be inserted to the view.
 *
 * The converter automatically consumes corresponding value from consumables list, stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}) and bind model and view elements.
 *
 *		modelDispatcher.on( 'insert:paragraph', insertElement( new ViewElement( 'p' ) ) );
 *
 *		modelDispatcher.on(
 *			'insert:myElem',
 *			insertElement( ( data, consumable, conversionApi ) => {
 *				let myElem = new ViewElement( 'myElem', { myAttr: true }, new ViewText( 'myText' ) );
 *
 *				// Do something fancy with myElem using data/consumable/conversionApi ...
 *
 *				return myElem;
 *			}
 *		) );
 *
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which
 * will be inserted.
 * @returns {Function} Insert element event converter.
 */
export function insertElement( elementCreator, modelElementFilter ) {
	return ( evt, data, consumable, conversionApi ) => {
		const modelElement = data.item;

		if ( modelElementFilter && !modelElementFilter( modelElement ) ) {
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

		const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );

		conversionApi.mapper.bindElements( modelElement, viewElement );
		viewWriter.insert( viewPosition, viewElement );
	};
}

export function attributeToChildElementAttribute( modelElement, modelAttribute, viewChildElement, customFn ) {
	return dispatcher => {
		dispatcher.on( `addAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
		dispatcher.on( `changeAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
		dispatcher.on( `removeAttribute:${ modelAttribute }:${ modelElement }`, modelToViewChildAttributeConverter( viewChildElement, customFn ) );
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

