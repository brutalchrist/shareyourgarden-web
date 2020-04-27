/*
* This class represents the class definition.
*/
export class Location {
    public type: 'Point';
    public coordinates: number[];

    constructor(data: any = null) {
        if (data) {
            this.type = data.type ? data.type : '';
            this.coordinates = data.coordinates ? data.coordinates : [0, 0];
        }
    }
}
