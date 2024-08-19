export const wktPolygonToCoordinates = (wkt: string): number[] => {
  return wkt.split('((')[1].split('))')[0].split(/ |\,/g).filter(Boolean).map(parseFloat)
}
