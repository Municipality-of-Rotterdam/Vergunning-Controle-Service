type GeoJSONPolygon = {
    spatialOperator: string;
    geometrie: {
        type: "Polygon";
        coordinates: number[][][];
    };
};
type GeoJSONPoint = {
    spatialOperator: string;
    geometrie: {
        type: "Point";
        coordinates: number[];
    };
};
export type Geometry = GeoJSONPoint | GeoJSONPolygon;
