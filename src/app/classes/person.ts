/*
* This class represents the class definition.
*/
export class Person {
    public name: string;
    public email: string;

    constructor(data: any = null) {
        if (data) {
            this.name = data.name ? data.name : '';
            this.email = data.email ? data.email : '';
        }
    }
}
