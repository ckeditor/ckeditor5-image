/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ClassicTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor';
import Image from '../src/image';
import ImageTextAlternative from '../src/imagetextalternative';
import ImageTextAlternativeEngine from '../src/imagetextalternative/imagetextalternativeengine';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import global from '@ckeditor/ckeditor5-utils/src/dom/global';
import { setData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { keyCodes } from '@ckeditor/ckeditor5-utils/src/keyboard';

/* global Event */

describe( 'ImageTextAlternative', () => {
	let editor, plugin, command, balloon, form, editableElement, editingView;

	beforeEach( () => {
		const editorElement = global.document.createElement( 'div' );
		global.document.body.appendChild( editorElement );

		return ClassicTestEditor.create( editorElement, {
			plugins: [ ImageTextAlternative, Image ]
		} )
		.then( newEditor => {
			editor = newEditor;
			editingView = editor.editing.view;
			editingView.attachDomRoot( editorElement );
			plugin = editor.plugins.get( ImageTextAlternative );
			command = editor.commands.get( 'imageTextAlternative' );
			balloon = plugin.balloon;
			form = plugin.form;
			editableElement = editingView.domConverter.getCorrespondingDomElement( editingView.selection.editableElement );
			sinon.stub( balloon, 'add' ).returns( Promise.resolve() );
		} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	it( 'should be loaded', () => {
		expect( plugin ).to.be.instanceOf( ImageTextAlternative );
	} );

	it( 'should load ImageTextAlternativeEngine plugin', () => {
		expect( editor.plugins.get( ImageTextAlternativeEngine ) ).to.be.instanceOf( ImageTextAlternativeEngine );
	} );

	describe( 'toolbar button', () => {
		let button;

		beforeEach( () => {
			button = editor.ui.componentFactory.create( 'imageTextAlternative' );
		} );

		it( 'should be registered in component factory', () => {
			expect( button ).to.be.instanceOf( ButtonView );
		} );

		it( 'should have isEnabled property bind to command\'s isEnabled property', () => {
			command.isEnabled = true;
			expect( button.isEnabled ).to.be.true;

			command.isEnabled = false;
			expect( button.isEnabled ).to.be.false;
		} );

		it( 'should call #_showBalloon on #execute', () => {
			const spy = sinon.spy( plugin, '_showBalloon' );
			setData( editor.document, '[<image src="" alt="foo bar"></image>]' );

			button.fire( 'execute' );
			sinon.assert.calledOnce( spy );
		} );
	} );

	describe( '_showBalloon', () => {
		it( 'should show balloon panel on execute', () => {
			setData( editor.document, '[<image src="" alt="foo bar"></image>]' );

			return plugin._showBalloon()
				.then( () => {
					sinon.assert.calledOnce( balloon.add );
					sinon.assert.calledWithExactly( balloon.add, {
						view: form,
						position: {
							limiter: editableElement,
						}
					} );
				} );
		} );

		it( 'should set alt attribute value to the field and select it', () => {
			const spy = sinon.spy( form.labeledInput, 'select' );
			setData( editor.document, '[<image src="" alt="foo bar"></image>]' );

			return plugin._showBalloon()
				.then( () => {
					sinon.assert.calledOnce( spy );
					expect( plugin.form.labeledInput.value ).equals( 'foo bar' );
				} );
		} );

		it( 'should leave the field empty and select it when there is no alt attribute', () => {
			const spy = sinon.spy( form.labeledInput, 'select' );
			setData( editor.document, '[<image src=""></image>]' );

			return plugin._showBalloon()
				.then( () => {
					sinon.assert.calledOnce( spy );
					expect( plugin.form.labeledInput.value ).equals( '' );
				} );
		} );
	} );

	describe( '_hideBalloon', () => {
		beforeEach( () => {
			sinon.stub( balloon, 'hasView' ).returns( true );
		} );

		it( 'it should remove the #form from the #balloon', () => {
			const spy = sinon.spy( balloon, 'remove' );

			return plugin._hideBalloon()
				.then( () => {
					sinon.assert.calledOnce( spy );
					sinon.assert.calledWithExactly( spy, form );
				} );
		} );

		it( 'it should focus the editing view', () => {
			const spy = sinon.spy( editingView, 'focus' );

			return plugin._hideBalloon()
				.then( () => {
					sinon.assert.calledOnce( spy );
				} );
		} );
	} );

	describe( 'balloon panel form', () => {
		it( 'should execute the command on #submit', () => {
			const spy = sinon.spy( editor, 'execute' );

			plugin._showBalloon()
				.then( () => {
					form.fire( 'submit' );

					sinon.assert.calledOnce( spy );
					sinon.assert.calledWithExactly( spy, 'imageTextAlternative', {
						newValue: form.labeledInput.inputView.element.value
					} );
				} );
		} );

		it( 'should hide the balloon on #cancel', () => {
			const spy = sinon.spy( plugin, '_hideBalloon' );

			plugin._showBalloon()
				.then( () => {
					form.fire( 'cancel' );
					sinon.assert.called( spy );
				} );
		} );

		describe( 'close listeners', () => {
			let hideSpy;

			beforeEach( () => {
				sinon.stub( balloon, 'hasView' ).returns( true );
				hideSpy = sinon.spy( plugin, '_hideBalloon' );
			} );

			describe( 'keyboard', () => {
				it( 'should close after `ESC` press', () => {
					const keyCode = keyCodes.esc;
					const event = global.document.createEvent( 'Events' );

					event.initEvent( 'keydown', true, true );
					event.which = keyCode;
					event.keyCode = keyCode;
					global.document.dispatchEvent( event );

					sinon.assert.calledOnce( hideSpy );
				} );
			} );

			describe( 'mouse', () => {
				it( 'should close and not focus editable on click outside the panel', () => {
					global.document.body.dispatchEvent( new Event( 'mouseup', { bubbles: true } ) );

					sinon.assert.called( hideSpy );
				} );

				it( 'should not close on click inside the panel', () => {
					balloon.view.element.dispatchEvent( new Event( 'mouseup', { bubbles: true } ) );

					sinon.assert.notCalled( hideSpy );
				} );
			} );
		} );
	} );
} );
