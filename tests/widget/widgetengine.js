/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import WidgetEngine from '../../src/widget/widgetengine';
import buildModelConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildmodelconverter';
import { setData as setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { getData as getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';
import ViewContainer from '@ckeditor/ckeditor5-engine/src/view/containerelement';
import ViewEditable from '@ckeditor/ckeditor5-engine/src/view/editableelement';
import ViewSelection from '@ckeditor/ckeditor5-engine/src/view/selection';
import ViewRange from '@ckeditor/ckeditor5-engine/src/view/range';
import { widgetize } from '../../src/widget/utils';

describe( 'WidgetEngine', () => {
	let editor, document, viewDocument;

	beforeEach( () => {
		return VirtualTestEditor.create( {
			plugins: [ WidgetEngine ]
		} )
			.then( newEditor => {
				editor = newEditor;
				document = editor.document;
				viewDocument = editor.editing.view;
				document.schema.registerItem( 'widget', '$block' );
				document.schema.registerItem( 'editable' );
				document.schema.allow( { name: '$inline', inside: 'editable' } );
				document.schema.allow( { name: 'editable', inside: 'widget' } );
				document.schema.allow( { name: 'editable', inside: '$root' } );
				document.schema.registerItem( 'paragraph', '$block' );

				buildModelConverter().for( editor.editing.modelToView )
					.fromElement( 'widget' )
					.toElement( () => widgetize( new ViewContainer( 'div' ) ) );

				buildModelConverter().for( editor.editing.modelToView )
					.fromElement( 'editable' )
					.toElement( () => new ViewEditable( 'figcaption', { contenteditable: true } ) );

				buildModelConverter().for( editor.editing.modelToView )
					.fromElement( 'paragraph' )
					.toElement( 'p' );
			} );
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( WidgetEngine ) ).to.be.instanceOf( WidgetEngine );
	} );

	it( 'should apply fake view selection if model selection is on widget element', () => {
		setModelData( document, '[<widget>foo bar</widget>]' );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<div class="ck-widget ck-widget_selected" contenteditable="false">foo bar</div>]'
		);
		expect( viewDocument.selection.isFake ).to.be.true;
	} );

	it( 'should toggle selected class', () => {
		setModelData( document, '[<widget>foo</widget>]' );

		expect( getViewData( viewDocument ) ).to.equal(
			'[<div class="ck-widget ck-widget_selected" contenteditable="false">foo</div>]'
		);

		document.enqueueChanges( () => {
			document.selection.collapseToStart();
		} );

		expect( getViewData( viewDocument ) ).to.equal(
			'[]<div class="ck-widget" contenteditable="false">foo</div>'
		);
	} );

	it( 'should add selected class if selection is placed inside nested editable', () => {
		setModelData( document, '<widget><editable>[foo bar]</editable></widget>' );

		expect( getViewData( viewDocument ) ).to.equal(
			'<div class="ck-widget ck-widget_selected" contenteditable="false">' +
				'<figcaption contenteditable="true">{foo bar}</figcaption>' +
			'</div>'
		);
	} );

	it( 'should do nothing when selection is placed in other editable', () => {
		setModelData( document, '<widget><editable>foo bar</editable></widget><editable>[baz]</editable>' );

		expect( getViewData( viewDocument ) ).to.equal(
			'<div class="ck-widget" contenteditable="false">' +
				'<figcaption contenteditable="true">foo bar</figcaption>' +
			'</div>' +
			'<figcaption contenteditable="true">{baz}</figcaption>'
		);
	} );

	describe( 'selection fixing', () => {
		let viewRoot, viewImage, oldSelection, newSelection;

		beforeEach( () => {
			// Set model data.
			setModelData( document, '' +
				'<paragraph>foo</paragraph><widget><editable>bar</editable></widget><paragraph>baz</paragraph>' );

			// Prepare view's selectionChange event.
			viewRoot = viewDocument.getRoot();
			viewImage = viewRoot.getChild( 1 );
			oldSelection = viewDocument.selection;
			newSelection = new ViewSelection();
		} );

		it( 'is inside widget', () => {
			newSelection.addRange( ViewRange.createFromParentsAndOffsets( viewImage, 0, viewImage, 1 ) );
			viewDocument.fire( 'selectionChange', { oldSelection, newSelection } );

			expect( getViewData( viewDocument ) ).to.equal(
				'<p>foo</p>' +
				'[<div class="ck-widget ck-widget_selected" contenteditable="false">' +
					'<figcaption contenteditable="true">bar</figcaption>' +
				'</div>]' +
				'<p>baz</p>'
			);
		} );

		it( 'starts in the widget', () => {
			newSelection.addRange( ViewRange.createFromParentsAndOffsets( viewImage, 0, viewRoot, 3 ) );
			viewDocument.fire( 'selectionChange', { oldSelection, newSelection } );

			expect( getViewData( viewDocument ) ).to.equal(
				'<p>foo</p>' +
				'<div class="ck-widget" contenteditable="false">' +
					'<figcaption contenteditable="true">bar</figcaption>' +
				'</div>' +
				'[<p>baz</p>]'
			);
		} );

		it( 'ends in the widget', () => {
			newSelection.addRange( ViewRange.createFromParentsAndOffsets( viewRoot, 0, viewImage, 1 ) );
			viewDocument.fire( 'selectionChange', { oldSelection, newSelection } );

			expect( getViewData( viewDocument ) ).to.equal(
				'[<p>foo</p>]' +
				'<div class="ck-widget" contenteditable="false">' +
					'<figcaption contenteditable="true">bar</figcaption>' +
				'</div>' +
				'<p>baz</p>'
			);
		} );
	} );
} );
