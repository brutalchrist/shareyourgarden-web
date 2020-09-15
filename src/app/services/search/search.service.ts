import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable()
export class SearchService {
  searchText = '';

  @Output() change: EventEmitter<string> = new EventEmitter();

  search(searchText) {
    this.searchText = searchText;
    this.change.emit(this.searchText);
  }
}
