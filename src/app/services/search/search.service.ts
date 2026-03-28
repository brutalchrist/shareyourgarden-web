import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable()
export class SearchService {
  searchText = '';

  @Output() searchChanged: EventEmitter<string> = new EventEmitter();

  search(searchText: string): void {
    this.searchText = searchText;
    this.searchChanged.emit(this.searchText);
  }
}
