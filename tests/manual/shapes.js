/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* global SVG, document, console, window */

import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';

import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '../../src/image';
import ImageStyle from '../../src/imagestyle';
import ImageToolbar from '../../src/imagetoolbar';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';

import { isImageWidget } from '../../src/image/utils';
import ClickObserver from '@ckeditor/ckeditor5-engine/src/view/observer/clickobserver';
import Position from '@ckeditor/ckeditor5-engine/src/view/position';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';

const HANDLER_DIAMETER = 10;
const HANDLER_HALFSIZE = HANDLER_DIAMETER / 2;

class ImageShapes extends Plugin {
	static get pluginName() {
		return 'ImageShapes';
	}

	init() {
		const editor = this.editor;
		const schema = editor.model.schema;

		editor.editing.view.addObserver( ClickObserver );

		schema.extend( 'image', { allowAttributes: 'imageShape' } );

		editor.editing.downcastDispatcher.on( 'insert:image', ( evt, data, conversionApi ) => {
			this._insertShapeEditor( evt, data, conversionApi );
		}, { priority: 'low' } );

		editor.editing.downcastDispatcher.on( 'attribute:imageShape:image', ( evt, data, conversionApi ) => {
			const writer = conversionApi.writer;
			const figure = conversionApi.mapper.toViewElement( data.item );

			writer.setAttribute( 'style', `shape-outside: ${ data.attributeNewValue }`, figure );
		} );
	}

	_insertShapeEditor( evt, data, conversionApi ) {
		const editor = this.editor;
		const writer = conversionApi.writer;
		const model = editor.model;
		const view = editor.editing.view;
		const viewDocument = view.document;
		const viewFigure = editor.editing.mapper.toViewElement( data.item );
		const shapeEditorElement = writer.createUIElement( 'div', { class: 'ck ck-image__shape-editor' } );

		view.change( () => {
			writer.insert( Position.createAt( viewFigure, 'end' ), shapeEditorElement );
		} );

		this.listenTo( viewDocument, 'click', () => {
			const viewElement = viewDocument.selection.getSelectedElement();

			if ( viewElement && isImageWidget( viewElement ) ) {
				if ( viewElement.hasAttribute( 'hasShapeEditor' ) ) {
					return;
				}

				const shapeEditorDomElement = view.domConverter.mapViewToDom( shapeEditorElement );

				this._createPolygonEditor( shapeEditorDomElement, handlerPositions => {
					const positionString = handlerPositions
						.map( ( { x, y } ) => `${ x }% ${ y }%` )
						.join( ',' );

					model.change( writer => {
						writer.setAttribute( 'imageShape', `polygon(${ positionString })`, data.item );
					} );
				} );

				view.change( () => {
					writer.setAttribute( 'hasShapeEditor', true, viewElement );
				} );
			}
		} );
	}

	_createPolygonEditor( editorElement, onHandlerMove ) {
		const svg = new SVG( editorElement ).size( '100%', '100%' );
		const links = svg.group();
		const markers = svg.group();
		const nodes = svg.group();
		const groups = [];
		const connectables = [];
		const editorRect = getEditorRect();

		createVertexGroup( -HANDLER_HALFSIZE, -HANDLER_HALFSIZE );
		createVertexGroup( editorRect.width / 2 - HANDLER_HALFSIZE, -HANDLER_HALFSIZE );
		createVertexGroup( editorRect.width - HANDLER_HALFSIZE, -HANDLER_HALFSIZE );
		createVertexGroup( editorRect.width - HANDLER_HALFSIZE, editorRect.height / 2 - HANDLER_HALFSIZE );
		createVertexGroup( editorRect.width - HANDLER_HALFSIZE, editorRect.height - HANDLER_HALFSIZE );
		createVertexGroup( editorRect.width / 2 - HANDLER_HALFSIZE, editorRect.height - HANDLER_HALFSIZE );
		createVertexGroup( -HANDLER_HALFSIZE, editorRect.height - HANDLER_HALFSIZE );
		createVertexGroup( -HANDLER_HALFSIZE, editorRect.height / 2 - HANDLER_HALFSIZE );

		connectGroups();

		function createVertexGroup( x, y ) {
			const group = nodes.group()
				.translate( x, y )
				.draggable( ( x, y ) => {
					const editorElementRect = getEditorRect();

					return {
						x: x > -HANDLER_HALFSIZE && x < editorElementRect.width - HANDLER_HALFSIZE,
						y: y > -HANDLER_HALFSIZE && y < editorElementRect.height - HANDLER_HALFSIZE
					};
				} );

			group.circle( HANDLER_DIAMETER );

			group.on( 'dragmove', () => {
				const editorElementRect = getEditorRect();

				onHandlerMove( groups.map( g => ( {
					x: Math.round( ( g.x() + HANDLER_HALFSIZE ) / editorElementRect.width * 100 ),
					y: Math.round( ( g.y() + HANDLER_HALFSIZE ) / editorElementRect.height * 100 )
				} ) ) );
			} );

			groups.push( group );
			return group;
		}

		function connectGroups() {
			for ( const g of groups ) {
				let prev;

				if ( g === groups[ 0 ] ) {
					prev = groups[ groups.length - 1 ];
				} else {
					prev = groups[ groups.indexOf( g ) - 1 ];
				}

				const connectable = g.connectable( {
					container: links,
					markers
				}, prev );

				connectables.push( connectable );
			}
		}

		function getEditorRect() {
			return editorElement.getBoundingClientRect();
		}
	}
}

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [
			Essentials,
			Autoformat,
			BlockQuote,
			Bold,
			Heading,
			Image,
			ImageStyle,
			ImageToolbar,
			ImageShapes,
			Italic,
			Link,
			List,
			Paragraph,
			Code
		],
		removePlugins: [ 'Bold' ],
		toolbar: [
			'heading',
			'|',
			'bold',
			'italic',
			'link',
			'bulletedList',
			'numberedList',
			'blockQuote',
			'undo',
			'redo'
		],
		image: {
			toolbar: [ 'imageStyle:full', 'imageStyle:side' ]
		}
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
