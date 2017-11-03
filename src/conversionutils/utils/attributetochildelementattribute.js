/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

export default function attributeToChildElementAttribute( modelElement, modelAttribute, viewChildElement, customFn ) {
	return dispatcher => {
		const converter = modelToViewChildAttributeConverter( viewChildElement, customFn );
		dispatcher.on( `addAttribute:${ modelAttribute }:${ modelElement }`, converter );
		dispatcher.on( `changeAttribute:${ modelAttribute }:${ modelElement }`, converter );
		dispatcher.on( `removeAttribute:${ modelAttribute }:${ modelElement }`, converter );
	};
}

function modelToViewChildAttributeConverter( viewChildElement, customFn ) {
	return ( evt, data, consumable, conversionApi ) => {
		const parts = evt.name.split( ':' );
		// TODO: use util method of that.
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
