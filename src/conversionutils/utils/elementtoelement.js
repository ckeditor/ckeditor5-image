/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ViewContainerElement from '@ckeditor/ckeditor5-engine/src/view/containerelement';
import ViewElement from '@ckeditor/ckeditor5-engine/src/view/element';
import viewWriter from '@ckeditor/ckeditor5-engine/src/view/writer';

export default function elementToElement( modelElementName, viewElement, options = {} ) {
	options = Object.assign({}, { priority: 'normal', insertAtStart: true }, options );
	viewElement = typeof viewElement == 'string' ? new ViewContainerElement( viewElement ) : viewElement;

	return dispatcher => {
		dispatcher.on( 'insert:' + modelElementName, insertElement( viewElement, options ), { priority: options.priority } );
	}
}

function insertElement( elementCreator, options ) {
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

		// When present - use options.insertPosition function to alter insertion position.
		if ( options.insertPosition ) {
			viewPosition = options.insertPosition( viewPosition )
		}

		conversionApi.mapper.bindElements( modelElement, viewElement );
		viewWriter.insert( viewPosition, viewElement );
	};
}
