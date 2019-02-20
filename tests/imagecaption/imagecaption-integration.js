/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Image from '../../src/image';
import ImageCaption from '../../src/imagecaption';
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import DomEventData from '@ckeditor/ckeditor5-engine/src/view/observer/domeventdata';
import Enter from '@ckeditor/ckeditor5-enter/src/enter';
import ShiftEnter from '@ckeditor/ckeditor5-enter/src/shiftenter';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Typing from '@ckeditor/ckeditor5-typing/src/typing';

import { getData as getModelData, setData as setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { getData as getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';

describe( 'ImageCaption integration', () => {
	let editorElement, editor, model, view, viewDocument;

	beforeEach( () => {
		editorElement = global.document.createElement( 'div' );
		global.document.body.appendChild( editorElement );
	} );

	afterEach( () => {
		editorElement.remove();
	} );

	describe( 'with Enter plugin only', () => {
		beforeEach( () => {
			return ClassicEditor
				.create( editorElement, {
					plugins: [
						Enter, Typing, Paragraph, Image, ImageCaption
					]
				} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					view = editor.editing.view;
					viewDocument = view.document;
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'does nothing if soft enter was pressed', () => {
			setModelData(
				model,
				'<paragraph>Foo.</paragraph><image src="foo.png"><caption>Foo.[]</caption></image><paragraph>Bar.</paragraph>'
			);

			const domEvent = new DomEventData( viewDocument, getDomEvent(), { isSoft: true } );
			const preventDefaultOriginal = domEvent.preventDefault;
			const preventDefaultStub = sinon.stub( domEvent, 'preventDefault' ).callsFake( preventDefaultOriginal );

			viewDocument.fire( 'enter', domEvent );

			expect( preventDefaultStub.callCount ).to.equal( 1 );

			assertModelData(
				'<paragraph>Foo.</paragraph>' +
				'<image src="foo.png">' +
					'<caption>Foo.[]</caption>' +
				'</image>' +
				'<paragraph>Bar.</paragraph>'
			);
		} );
	} );

	describe( 'with Enter and ShiftEnter plugins', () => {
		beforeEach( () => {
			return ClassicEditor
				.create( editorElement, {
					plugins: [
						Enter, ShiftEnter, Typing, Paragraph, Image, ImageCaption
					]
				} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					view = editor.editing.view;
					viewDocument = view.document;
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'inserts a soft break when soft enter was pressed', () => {
			setModelData(
				model,
				'<paragraph>Foo.</paragraph><image src="foo.png"><caption>Foo.[]</caption></image><paragraph>Bar.</paragraph>'
			);

			const domEvent = new DomEventData( viewDocument, getDomEvent(), { isSoft: true } );
			const preventDefaultOriginal = domEvent.preventDefault;
			const preventDefaultStub = sinon.stub( domEvent, 'preventDefault' ).callsFake( preventDefaultOriginal );

			viewDocument.fire( 'enter', domEvent );

			// One call comes from Enter plugin, the second one from ShiftEnter.
			expect( preventDefaultStub.callCount ).to.equal( 2 );

			assertModelData(
				'<paragraph>Foo.</paragraph>' +
					'<image src="foo.png">' +
						'<caption>Foo.<softBreak></softBreak>[]</caption>' +
					'</image>' +
				'<paragraph>Bar.</paragraph>'
			);
		} );
	} );

	// See: https://github.com/ckeditor/ckeditor5/issues/1463
	describe( 'multi clicking inside figcaption', () => {
		beforeEach( () => {
			return ClassicEditor
				.create( editorElement, {
					plugins: [
						Enter, Typing, Paragraph, Image, ImageCaption
					]
				} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;
					view = editor.editing.view;
					viewDocument = view.document;
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'does nothing when double clicked the caption', () => {
			setModelData( model, '<image src=""><caption>Foo[]</caption></image>' );

			const viewRoot = viewDocument.getRoot();
			const target = view.domConverter.mapViewToDom( viewRoot.getChild( 0 ).getChild( 1 ) );

			viewDocument.fire( 'mousedown', new DomEventData( view, getDomEvent( {
				target,
				detail: 2
			} ) ) );

			assertViewData(
				'<figure class="ck-widget image" contenteditable="false">' +
					'<img src=""></img>' +
					// eslint-disable-next-line max-len
					'<figcaption class="ck-editor__editable ck-editor__nested-editable" contenteditable="true" data-placeholder="Enter image caption">' +
						'Foo{}' +
					'</figcaption>' +
				'</figure>'
			);
		} );

		it( 'selects the entire figcaption on triple click', () => {
			setModelData( model, '<image src=""><caption>Foo[]</caption></image>' );

			const viewRoot = viewDocument.getRoot();
			const target = view.domConverter.mapViewToDom( viewRoot.getChild( 0 ).getChild( 1 ) );

			viewDocument.fire( 'mousedown', new DomEventData( view, getDomEvent( {
				target,
				detail: 3
			} ) ) );

			assertViewData(
				'<figure class="ck-widget image" contenteditable="false">' +
					'<img src=""></img>' +
					// eslint-disable-next-line max-len
					'<figcaption class="ck-editor__editable ck-editor__nested-editable" contenteditable="true" data-placeholder="Enter image caption">' +
						'[Foo]' +
					'</figcaption>' +
				'</figure>'
			);
		} );

		it( 'selects the entire figcaption on quadra click', () => {
			setModelData( model, '<image src=""><caption>Foo[]</caption></image>' );

			const viewRoot = viewDocument.getRoot();
			const target = view.domConverter.mapViewToDom( viewRoot.getChild( 0 ).getChild( 1 ) );

			viewDocument.fire( 'mousedown', new DomEventData( view, getDomEvent( {
				target,
				detail: 4
			} ) ) );

			assertViewData(
				'<figure class="ck-widget image" contenteditable="false">' +
					'<img src=""></img>' +
					// eslint-disable-next-line max-len
					'<figcaption class="ck-editor__editable ck-editor__nested-editable" contenteditable="true" data-placeholder="Enter image caption">' +
						'[Foo]' +
					'</figcaption>' +
				'</figure>'
			);
		} );

		it( 'does nothing if clicked element is not a figcaption', () => {
			setModelData( model, '<image src=""><caption>Foo[]</caption></image>' );

			const viewRoot = viewDocument.getRoot();
			const target = view.domConverter.mapViewToDom( viewRoot.getChild( 0 ).getChild( 0 ) );

			// After clicking the image element, the entire widget should be selected.
			viewDocument.fire( 'mousedown', new DomEventData( view, getDomEvent( {
				target,
				detail: 3
			} ) ) );

			assertViewData(
				'[<figure class="ck-widget ck-widget_selected image" contenteditable="false">' +
					'<img src=""></img>' +
					// eslint-disable-next-line max-len
					'<figcaption class="ck-editor__editable ck-editor__nested-editable" contenteditable="true" data-placeholder="Enter image caption">' +
						'Foo' +
					'</figcaption>' +
				'</figure>]'
			);
		} );
	} );

	function getDomEvent( options = {} ) {
		return Object.assign( {}, options, {
			preventDefault: sinon.spy()
		} );
	}

	function assertModelData( output ) {
		expect( getModelData( model ) ).to.equal( output );
	}

	function assertViewData( output ) {
		expect( getViewData( view ) ).to.equal( output );
	}
} );
