"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliceOrderQuantity = sliceOrderQuantity;
function sliceOrderQuantity(orderQty, index) {
    const freeze_qty = {
        NIFTY: 1800,
        BANKNIFTY: 900,
        FINNIFTY: 1800,
    };
    let slicedQuantity = [];
    if (["FINNIFTY", "BANKNIFTY", "NIFTY"].includes(index)) {
        while (orderQty > 0) {
            if (orderQty >= freeze_qty[index]) {
                slicedQuantity.push(freeze_qty[index]);
                orderQty -= freeze_qty[index];
            }
            else {
                slicedQuantity.push(orderQty);
                orderQty = 0;
            }
        }
        return slicedQuantity;
    }
    return [orderQty];
}
