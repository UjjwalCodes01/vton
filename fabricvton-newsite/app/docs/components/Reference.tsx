import type { ReactNode } from "react";
import { API_BASE_URL } from "../../lib/site";

export type HttpMethod = "GET" | "POST";

/** A small coloured badge naming an HTTP method. */
export function Method({ method }: { method: HttpMethod }) {
  return <span className={`doc-method ${method.toLowerCase()}`}>{method}</span>;
}

/** The method and full URL of an endpoint, shown at the top of its reference page. */
export function EndpointLine({ method, path }: { method: HttpMethod; path: string }) {
  return (
    <p className="doc-endpoint">
      <Method method={method} />
      <code>
        <span>{API_BASE_URL}</span>
        {path}
      </code>
    </p>
  );
}

export type ErrorRow = [status: number, code: string, when: string];

/** The errors one endpoint is likely to return. The full list lives on the Errors & limits page. */
export function ErrorTable({ rows }: { rows: ErrorRow[] }) {
  return (
    <div className="doc-table">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Code</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([status, code, when]) => (
            <tr key={code}>
              <td>{status}</td>
              <td>
                <code>{code}</code>
              </td>
              <td>{when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A plain table of fields: name, type and a description (which may hold markup). */
export function FieldTable({ head = "Field", rows }: { head?: string; rows: [name: string, type: string, about: ReactNode][] }) {
  return (
    <div className="doc-table">
      <table>
        <thead>
          <tr>
            <th>{head}</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, type, about]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{type}</td>
              <td>{about}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
