import { createContext, useContext } from "react";

export interface IAirport {
  name: string;
  elevation: number;
  magneticVariation: number;
}

interface IAirportDto {
  n: string;
  c?: string;
  e: number;
  mv: number;
  freqs?: IFrequencyDto[];
  runways: IRunwayDto[];
}

interface IFrequencyDto {
  t: string;
  f: number;
  n: string;
}

interface IRunwayDto {
  s: string;
  l: number;
  w: number;
  e?: number;
  e1: IRunwayEndDto;
  e2: IRunwayEndDto;
}
interface IRunwayEndDto {
  n: string;
  h: number;
  c?: boolean;
  p?: string;
  o?: number;
}

type PrefixDtos = Record<string, IAirportDto>;

export class AirportDB {
  private readonly airportCache: Map<string, IAirport> = new Map();
  private readonly prefixLoadCache: Map<string, Promise<PrefixDtos>> =
    new Map();

  public async getAirport(ident: string): Promise<IAirport | undefined> {
    let airport = this.airportCache.get(ident);
    if (airport) {
      return airport;
    }

    const prefix = getPrefix(ident);

    const dtos = await this.getPrefixData(prefix);
    const dto = dtos[ident];
    if (dto) {
      return {
        name: dto.n,
        elevation: dto.e,
        magneticVariation: dto.mv,
      };
    }
  }

  private getPrefixData(prefix: string): Promise<PrefixDtos> {
    let promise = this.prefixLoadCache.get(prefix);
    if (promise) {
      return promise;
    }
    promise = fetch(`./data/airports-${prefix}.json`).then((request) => {
      if (request.status === 404) {
        // An entire prefix does not exist.
        return {};
      }
      return request.json();
    });
    this.prefixLoadCache.set(prefix, promise);
    return promise;
  }
}

function getPrefix(ident: string) {
  return ident.substring(0, 2);
}

export const AirportDBContext = createContext<AirportDB | undefined>(undefined);

export function useAirportDB(): AirportDB {
  return useContext(AirportDBContext)!;
}
