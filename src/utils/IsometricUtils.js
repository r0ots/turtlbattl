export class IsometricUtils {
    static cartesianToIsometric(x, y) {
        const isoX = x - y;
        const isoY = (x + y) / 2;
        return { x: isoX, y: isoY };
    }

    static isometricToCartesian(isoX, isoY) {
        const x = (2 * isoY + isoX) / 2;
        const y = (2 * isoY - isoX) / 2;
        return { x, y };
    }

    static getDepth(x, y) {
        return x + y;
    }
}