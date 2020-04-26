import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RestService {
  private api: string;
  private jwt: string;

  constructor(private http: HttpClient) {
    this.api = environment.API;

    const jwt = localStorage.getItem('authToken');
    if (jwt) { this.jwt = jwt; }
  }

  public get(uri: string) {
    const headers = this.createHeaders();

    return this.http.get(this.api + uri, { headers });
  }

  public post(uri: string, data: any, extraOptions: any = null) {
    const headers = this.createHeaders();
    const options = { headers };

    return this.http.post(
      this.api + uri,
      data,
      {...options, ...extraOptions}
    );
  }

  public patch(uri: string, data: any) {
    const headers = this.createHeaders();

    return this.http.patch(this.api + uri, data, { headers });
  }

  public delete(uri: string, id: number): Observable<any> {
    const headers = this.createHeaders();

    const urlBase = this.api + uri;
    const url = (id) ? `${urlBase}/${id}` : urlBase;

    return this.http.delete(url, {
      headers,
      observe: 'response'
    });
  }

  public setJWT(token: string) {
    this.jwt = token;
  }

  private createHeaders() {
    let headers = new HttpHeaders();
    headers = this.setContentType(headers);
    // headers = this.setAuthorization(headers);

    return headers;
  }

  private setAuthorization(headers: HttpHeaders): HttpHeaders {
    return headers.set('Authorization', `Bearer ${this.jwt}`);
  }

  private setContentType(headers: HttpHeaders): HttpHeaders {
    return headers.set('Content-Type', 'application/json; charset=utf-8');
  }
}
