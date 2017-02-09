/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/widget/widgetengine
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import RootEditable from '@ckeditor/ckeditor5-engine/src/view/rooteditableelement';
import EditableElement from '@ckeditor/ckeditor5-engine/src/view/editableelement';
import ViewText from '@ckeditor/ckeditor5-engine/src/view/text';
import ViewRange from '@ckeditor/ckeditor5-engine/src/view/range';
import ViewPosition from '@ckeditor/ckeditor5-engine/src/view/position';
import { WIDGET_SELECTED_CLASS_NAME, isWidget } from './utils';

/**
 * The widget engine plugin.
 * Registers model to view selection converter for editing pipeline. It is hooked after default selection conversion.
 * If converted selection is placed around widget element, selection is marked as fake. Additionally, proper CSS class
 * is added to indicate that widget has been selected.
 *
 * @extends module:core/plugin~Plugin.
 */
export default class WidgetEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		let previouslySelected;

		// Model to view selection converter.
		// Converts selection placed over widget element to fake selection
		this.editor.editing.modelToView.on( 'selection', ( evt, data, consumable, conversionApi ) => {
			// Remove selected class from previously selected widget.
			if ( previouslySelected && previouslySelected.hasClass( WIDGET_SELECTED_CLASS_NAME ) ) {
				previouslySelected.removeClass( WIDGET_SELECTED_CLASS_NAME );
			}

			const viewSelection = conversionApi.viewSelection;

			// Add CSS class if selection is placed inside nested editable that belongs to widget.
			const editableElement = viewSelection.editableElement;

			if ( editableElement && !( editableElement instanceof RootEditable ) ) {
				const widget = editableElement.findAncestor( element => isWidget( element ) );

				if ( widget ) {
					widget.addClass( WIDGET_SELECTED_CLASS_NAME );
					previouslySelected = widget;

					return;
				}
			}

			// Check if widget was clicked or some sub-element.
			const selectedElement = viewSelection.getSelectedElement();

			if ( !selectedElement || !isWidget( selectedElement ) ) {
				return;
			}

			viewSelection.setFake( true );
			selectedElement.addClass( WIDGET_SELECTED_CLASS_NAME );
			previouslySelected = selectedElement;
		}, { priority: 'low' } );

		// Try to fix selection which somehow ended inside the widget, where it shouldn't be.
		this.editor.editing.view.on( 'selectionChange', ( evt, data ) => {
			const newSelection = data.newSelection;
			const newRanges = [];

			for ( let range of newSelection.getRanges() ) {
				const start = range.start;
				const end = range.end;
				const startWidget = getWidgetAncestor( start.parent );
				const endWidget = getWidgetAncestor( end.parent );

				// Whole range is placed inside widget - put selection around that widget.
				if ( startWidget !== null && startWidget == endWidget ) {
					newRanges.push( ViewRange.createOn( startWidget ) );

					continue;
				}

				// Range start is placed inside the widget - start selection after the widget.
				if ( startWidget !== null ) {
					newRanges.push( new ViewRange( ViewPosition.createAfter( startWidget ), end ) );

					continue;
				}

				// Range end is placed inside widget - end selection before the widget.
				if ( endWidget !== null ) {
					newRanges.push( new ViewRange( start, ViewPosition.createBefore( endWidget ) ) );

					continue;
				}

				newRanges.push( range );
			}

			if ( newRanges.length ) {
				newSelection.setRanges( newRanges, newSelection.isBackward );
			}
		}, { priority: 'high' } );
	}
}

// Returns widget which is an ancestor of given node.
// Returns `null` if there is no widget ancestor or node is placed inside nested editable.
//
// @private
// @param {module:engine/view/node~Node} node
// @return {module:engine/view/Element|null}
function getWidgetAncestor( node ) {
	if ( node instanceof ViewText ) {
		node = node.parent;
	}

	while ( node ) {
		if ( node instanceof EditableElement ) {
			return null;
		}

		if ( isWidget( node ) ) {
			return node;
		}

		node = node.parent;
	}

	return null;
}
