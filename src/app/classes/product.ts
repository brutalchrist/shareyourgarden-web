/*
* This class represents the class definition.
*/
export class Product {
    public name: string;
    public type: string;
    public quantity: number;

    constructor(data: any = null) {
        if (data) {
            this.name = data.name ? data.name : '';
            this.type = data.type ? data.type : '';
            this.quantity = data.quantity ? data.quantity : 0;
        }
    }
}
