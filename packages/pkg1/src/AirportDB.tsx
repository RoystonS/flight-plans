import { createContext, useContext } from "react";

const surfaceTypeNames: Record<string, string> = {
  A: "Asphalt",
  B: "Bituminous",
  C: "Concrete",
  CE: "Cement",
  CR: "Coral",
  D: "Dirt",
  G: "Grass",
  GR: "Gravel",
  M: "Macadam",
  OT: "Oil Treated",
  S: "Sand",
  SN: "Snow",
  T: "Tarmac",
  W: "Water",
  UNKNOWN: "Unknown",
};

export interface IAirport {
  name: string;
  city?: string;
  elevation: number;
  magneticVariation: number;
  runways: IRunway[];
}

export interface IRunway {
  surface: string;
  length: number;
  width: number;
  elevation: number;
  end1: IRunwayEnd;
  end2: IRunwayEnd;
}

export type PatternDirection = "L" | "R";

export interface IRunwayEnd {
  name: string;
  heading: number;
  closed: boolean;
  patternDirection: PatternDirection;
  offsetThreshold: number;
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
      const runways = dto.runways.map((rwDto) => {
        const runway: IRunway = {
          elevation: rwDto.e ?? dto.e,
          length: rwDto.l,
          width: rwDto.w,
          surface: surfaceTypeNames[rwDto.s],
          end1: {
            closed: !!rwDto.e1.c,
            heading: rwDto.e1.h,
            name: rwDto.e1.n,
            offsetThreshold: rwDto.e1.o ?? 0,
            patternDirection: (rwDto.e1.p as PatternDirection) ?? "L",
          },
          end2: {
            closed: !!rwDto.e2.c,
            heading: rwDto.e2.h,
            name: rwDto.e2.n,
            offsetThreshold: rwDto.e2.o ?? 0,
            patternDirection: (rwDto.e2.p as PatternDirection) ?? "L",
          },
        };
        return runway;
      });

      return {
        name: dto.n,
        elevation: dto.e,
        magneticVariation: dto.mv,
        city: dto.c,
        runways,
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
