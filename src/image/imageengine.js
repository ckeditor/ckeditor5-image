/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/image/imageengine
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

import buildModelConverter from '../conversionutils/buildmodelconverter';
import elementToElement from '../conversionutils/utils/elementtoelement';
import attributeToChildElementAttribute from '../conversionutils/utils/attributetochildelementattribute';

import buildViewConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildviewconverter';

import {
	viewFigureToModel,
	convertHoistableImage,
	hoistImageThroughElement
} from './converters';

import { toImageWidget } from './utils';
import ModelElement from '@ckeditor/ckeditor5-engine/src/model/element';
import ViewContainerElement from '@ckeditor/ckeditor5-engine/src/view/containerelement';
import ViewEmptyElement from '@ckeditor/ckeditor5-engine/src/view/emptyelement';

/**
 * The image engine plugin.
 * Registers `<image>` as a block element in the document schema, and allows `alt`, `src` and `srcset` attributes.
 * Registers converters for editing and data pipelines.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ImageEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const doc = editor.document;
		const schema = doc.schema;
		const data = editor.data;
		const editing = editor.editing;
		const t = editor.t;

		// Configure schema.
		schema.registerItem( 'image' );
		schema.requireAttributes( 'image', [ 'src' ] );
		schema.allow( { name: 'image', attributes: [ 'alt', 'src', 'srcset' ], inside: '$root' } );
		schema.objects.add( 'image' );

		// Build converter for data pipeline: "image" element to <figure><img /></figure>.
		buildModelConverter()
			.for( data.modelToView )
			// TODO: accept just a function name.
			.use( elementToElement( 'image', () => createImageViewElement() ) );

		// Build converter for data pipeline: "image" element to <figure><img /></figure> as widget.
		buildModelConverter()
			.for( editing.modelToView )
			.use( elementToElement( 'image', () => toImageWidget( createImageViewElement(), t( 'image widget' ) ) ) );

		buildModelConverter()
			.for( editing.modelToView, data.modelToView )
			.use( attributeToChildElementAttribute( 'image', 'src', 'img' ) )
			.use( attributeToChildElementAttribute( 'image', 'alt', 'img' ) )
			.use( attributeToChildElementAttribute( 'image', 'srcset', 'img', setSrcsetAttirbute ) );

		// Build converter for view img element to model image element.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { src: /./ } } )
			.toElement( viewImage => new ModelElement( 'image', { src: viewImage.getAttribute( 'src' ) } ) );

		data.viewToModel.on( 'element:img', convertHoistableImage, { priority: 'low' } );
		data.viewToModel.on( 'element', hoistImageThroughElement, { priority: 'low' } );

		// Build converter for alt attribute.
		// Note that by default attribute converters are added with `low` priority.
		// This converter will be thus fired after `convertHoistableImage` converter.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { alt: /./ } } )
			.consuming( { attribute: [ 'alt' ] } )
			.toAttribute( viewImage => ( { key: 'alt', value: viewImage.getAttribute( 'alt' ) } ) );

		// Build converter for srcset attribute.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { srcset: /./ } } )
			.consuming( { attribute: [ 'srcset' ] } )
			.toAttribute( viewImage => {
				const value = {
					data: viewImage.getAttribute( 'srcset' )
				};

				if ( viewImage.hasAttribute( 'width' ) ) {
					value.width = viewImage.getAttribute( 'width' );
				}

				return {
					key: 'srcset',
					value
				};
			} );

		// Converter for figure element from view to model.
		data.viewToModel.on( 'element:figure', viewFigureToModel() );
	}
}

// Creates a view element representing the image.
//
//		<figure class="image"><img></img></figure>
//
// Note that `alt` and `src` attributes are converted separately, so they are not included.
//
// @private
// @return {module:engine/view/containerelement~ContainerElement}
export function createImageViewElement() {
	return new ViewContainerElement( 'figure', { class: 'image' }, new ViewEmptyElement( 'img' ) );
}

function setSrcsetAttirbute( type, img, data ) {
	if ( type == 'removeAttribute' ) {
		const srcset = data.attributeOldValue;

		if ( srcset.data ) {
			img.removeAttribute( 'srcset' );
			img.removeAttribute( 'sizes' );

			if ( srcset.width ) {
				img.removeAttribute( 'width' );
			}
		}
	} else {
		const srcset = data.attributeNewValue;

		if ( srcset.data ) {
			img.setAttribute( 'srcset', srcset.data );
			// Always outputting `100vw`. See https://github.com/ckeditor/ckeditor5-image/issues/2.
			img.setAttribute( 'sizes', '100vw' );

			if ( srcset.width ) {
				img.setAttribute( 'width', srcset.width );
			}
		}
	}
}
