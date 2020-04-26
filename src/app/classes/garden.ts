import { Person } from './person';
import { Product } from './product';
import { Location } from './location';
/*
* This class represents the class definition.
*/
export class Garden {
    public name: string;
    public location: Location;
    public products: Product[] = [];
    public owner: Person;
​​
    constructor(data: any = null) {
        if (data) {
            this.name = data.name ? data.name : '';
            this.location = new Location(data.location);
            data.products.forEach((element: any) => {
                this.products.push(new Product(element));
            });
            this.owner = new Person(data.owner);
        }
    }
}
