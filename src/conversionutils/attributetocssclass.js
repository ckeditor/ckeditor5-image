/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import { eventNameToConsumableType } from '@ckeditor/ckeditor5-engine/src/conversion/model-to-view-converters';

export default function attributeToCssClass( elementName, attributeName, attributeToClass, options ) {
	options = Object.assign( {}, { priority: 'normal' }, options );
	const converter = toCssClass( attributeToClass );

	return dispatcher => {
		dispatcher.on( `addAttribute:${ attributeName }:${ elementName }`, converter, { priority: options.priority } );
		dispatcher.on( `changeAttribute:${ attributeName }:${ elementName }`, converter, { priority: options.priority } );
		dispatcher.on( `removeAttribute:${ attributeName }:${ elementName }`, converter, { priority: options.priority } );
	};
}

function toCssClass( attributeToClass ) {
	return ( evt, data, consumable, conversionApi ) => {
		const eventType = evt.name.split( ':' )[ 0 ];
		const consumableType = eventNameToConsumableType( evt.name );

		if ( !consumable.test( data.item, consumableType ) ) {
			return;
		}

		const viewElement = conversionApi.mapper.toViewElement( data.item );
		const newClass = attributeToClass( data.attributeNewValue );
		const oldClass = attributeToClass( data.attributeOldValue );

		const isRemovalHandled = handleRemoval( eventType, oldClass, viewElement );
		const isAdditionHandled = handleAddition( eventType, newClass, viewElement );

		// https://github.com/ckeditor/ckeditor5-image/issues/132
		if ( isRemovalHandled || isAdditionHandled ) {
			consumable.consume( data.item, consumableType );
		}
	};
}

// Handles converting removal of the attribute.
// Returns `true` when handling was processed correctly and further conversion can be performed.
//
// @param {String} eventType Type of the event.
// @param {module:image/imagestyle/imagestyleengine~ImageStyleFormat} style
// @param {module:engine/view/element~Element} viewElement
// @returns {Boolean} Whether the change was handled.
function handleRemoval( eventType, cssClass, viewElement ) {
	if ( cssClass && ( eventType == 'changeAttribute' || eventType == 'removeAttribute' ) ) {
		viewElement.removeClass( cssClass );

		return true;
	}

	return false;
}

// Handles converting addition of the attribute.
// Returns `true` when handling was processed correctly and further conversion can be performed.
//
// @param {String} eventType Type of the event.
// @param {module:image/imagestyle/imagestyleengine~ImageStyleFormat} style
// @param {module:engine/view/element~Element} viewElement
// @returns {Boolean} Whether the change was handled.
function handleAddition( evenType, cssClass, viewElement ) {
	if ( cssClass && ( evenType == 'addAttribute' || evenType == 'changeAttribute' ) ) {
		viewElement.addClass( cssClass );

		return true;
	}

	return false;
}
