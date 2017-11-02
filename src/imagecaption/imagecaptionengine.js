/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/imagecaption/imagecaptionengine
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ModelTreeWalker from '@ckeditor/ckeditor5-engine/src/model/treewalker';
import ModelElement from '@ckeditor/ckeditor5-engine/src/model/element';
import ModelPosition from '@ckeditor/ckeditor5-engine/src/model/position';
import ViewPosition from '@ckeditor/ckeditor5-engine/src/view/position';
import buildViewConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildviewconverter';
import { isImage } from '../image/utils';
import {
	captionElementCreator,
	getCaptionFromImage,
	matchImageCaption
} from './utils';

import buildModelConverter from '../conversionutils/buildmodelconverter';
import elementToElement from '../conversionutils/utils/elementtoelement';

/**
 * The image caption engine plugin.
 *
 * It registers proper converters. It takes care of adding a caption element if the image without it is inserted
 * to the model document.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ImageCaptionEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const document = editor.document;
		const viewDocument = editor.editing.view;
		const schema = document.schema;
		const data = editor.data;
		const editing = editor.editing;
		const t = editor.t;

		/**
		 * Last selected caption editable.
		 * It is used for hiding the editable when it is empty and the image widget is no longer selected.
		 *
		 * @private
		 * @member {module:engine/view/editableelement~EditableElement} #_lastSelectedCaption
		 */

		/**
		 * A function used to create the editable caption element in the editing view.
		 *
		 * @private
		 * @member {Function}
		 */
		this._createCaption = captionElementCreator( viewDocument, t( 'Enter image caption' ) );

		// Schema configuration.
		schema.registerItem( 'caption', '$block' );
		schema.allow( { name: '$inline', inside: 'caption' } );
		schema.allow( { name: 'caption', inside: 'image' } );
		schema.limits.add( 'caption' );

		// Add caption element to each image inserted without it.
		document.on( 'change', insertMissingModelCaptionElement );

		// View to model converter for the data pipeline.
		buildViewConverter()
			.for( data.viewToModel )
			.from( matchImageCaption )
			.toElement( 'caption' );

		buildModelConverter()
			.for( data.modelToView )
			.use( elementToElement( 'caption', 'figcaption', {
				// Convert only non-empty captions from images.
				filter: element => isImage( element.parent ) && element.childCount,

				// Alter insertion position to insert figcaption at the end of the parent figure.
				insertPosition: viewPosition => ViewPosition.createAt( viewPosition.parent, 'end' )
			} ) );

		buildModelConverter()
			.for( editing.modelToView )
			.use( elementToElement( 'caption', this._createCaption, {
				// Convert only captions of images.
				filter: element => isImage( element.parent ),

				// Alter insertion position to insert figcaption at the end of the parent figure.
				insertPosition: viewPosition => ViewPosition.createAt( viewPosition.parent, 'end' )
			} ) );

		// Always show caption in view when something is inserted in model.
		editing.modelToView.on( 'insert', ( evt, data ) => this._fixCaptionVisibility( data.item ), { priority: 'high' } );

		// Hide caption when everything is removed from it.
		editing.modelToView.on( 'remove', ( evt, data ) => this._fixCaptionVisibility( data.sourcePosition.parent ), { priority: 'high' } );

		// Update view before each rendering.
		this.listenTo( viewDocument, 'render', () => this._updateCaptionVisibility(), { priority: 'high' } );
	}

	/**
	 * Updates the view before each rendering, making sure that empty captions (so unnecessary ones) are hidden
	 * and then visible when the image is selected.
	 *
	 * @private
	 */
	_updateCaptionVisibility() {
		const mapper = this.editor.editing.mapper;
		let viewCaption;

		// Hide last selected caption if have no child elements.
		if ( this._lastSelectedCaption && !this._lastSelectedCaption.childCount ) {
			this._lastSelectedCaption.addClass( 'ck-hidden' );
		}

		// If whole image is selected.
		const modelSelection = this.editor.document.selection;
		const selectedElement = modelSelection.getSelectedElement();

		if ( selectedElement && selectedElement.is( 'image' ) ) {
			const modelCaption = getCaptionFromImage( selectedElement );
			viewCaption = mapper.toViewElement( modelCaption );
		}

		// If selection is placed inside caption.
		const position = modelSelection.getFirstPosition();
		const modelCaption = getParentCaption( position.parent );

		if ( modelCaption ) {
			viewCaption = mapper.toViewElement( modelCaption );
		}

		if ( viewCaption ) {
			viewCaption.removeClass( 'ck-hidden' );
			this._lastSelectedCaption = viewCaption;
		}
	}

	/**
	 * Fixes caption visibility during the model-to-view conversion.
	 * Checks if the changed node is placed inside the caption element and fixes its visibility in the view.
	 *
	 * @private
	 * @param {module:engine/model/node~Node} node
	 */
	_fixCaptionVisibility( node ) {
		const modelCaption = getParentCaption( node );
		const mapper = this.editor.editing.mapper;

		if ( modelCaption ) {
			const viewCaption = mapper.toViewElement( modelCaption );

			if ( viewCaption ) {
				if ( modelCaption.childCount ) {
					viewCaption.removeClass( 'ck-hidden' );
				} else {
					viewCaption.addClass( 'ck-hidden' );
				}
			}
		}
	}
}

// Checks whether data inserted to the model document have image element that has no caption element inside it.
// If there is none - adds it to the image element.
//
// @private
function insertMissingModelCaptionElement( evt, changeType, data, batch ) {
	if ( changeType !== 'insert' ) {
		return;
	}

	const walker = new ModelTreeWalker( {
		boundaries: data.range,
		ignoreElementEnd: true
	} );

	for ( const value of walker ) {
		const item = value.item;

		if ( value.type == 'elementStart' && isImage( item ) && !getCaptionFromImage( item ) ) {
			batch.document.enqueueChanges( () => {
				// Make sure that the image does not have caption already.
				// https://github.com/ckeditor/ckeditor5-image/issues/78
				if ( !getCaptionFromImage( item ) ) {
					batch.insert( ModelPosition.createAt( item, 'end' ), new ModelElement( 'caption' ) );
				}
			} );
		}
	}
}

/**
 * Checks if the provided node or one of its ancestors is a caption element, and returns it.
 *
 * @param {module:engine/model/node~Node} node
 * @returns {module:engine/model/element~Element|null}
 */
function getParentCaption( node ) {
	const ancestors = node.getAncestors( { includeSelf: true } );
	const caption = ancestors.find( ancestor => ancestor.name == 'caption' );

	if ( caption && caption.parent && caption.parent.name == 'image' ) {
		return caption;
	}

	return null;
}
