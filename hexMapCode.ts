

export class Point {
    constructor (public x:number, public y:number) {}
}

export class Hex {
    constructor (public q:number, public r:number, public s:number) {
        if (Math.round(q + r + s) !== 0) throw "q + r + s must be 0";
    }

    public add(b:Hex):Hex {
        return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
    }

    public subtract(b:Hex):Hex {
        return new Hex(this.q -b.q, this.r - b.r, this.s - b.s);
    }

    public scale(k:number):Hex {
        return new Hex(this.q * k, this.r * k, this.s * k);
    }

    public rotateLeft():Hex {
        return new Hex(-this.s, -this.q, -this.r);
    }

    public rotateRight():Hex {
        return new Hex(-this.r, -this.s, -this.q)
    }

    public static directions:Hex[] = [new Hex(1,0,-1), new Hex(1,-1,0), new Hex(0,-1,1), new Hex(-1,0,1), new Hex(-1,1,0), new Hex(0,1,-1)];

    public static direction(direction:number):Hex {
        return Hex.directions[direction];
    }

    public neighbor(direction:number):Hex {
        return this.add(Hex.direction(direction));
    }

    public static diagonals:Hex[] = [new Hex(2,-1,1), new Hex(1,-2,1), new Hex(-1,-1,2), new Hex(-2,1,1), new Hex(-1,2,-1), new Hex(1,1,-2)];

    public diagonalNeighbor(direction:number):Hex {
        return this.add(Hex.diagonals[direction]);
    }

    public len():number {
        return(Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s))/2;
    }

    public distance(b:Hex):number {
        return this.subtract(b).len();
    }

    public round():Hex {
        var qi:number = Math.round(this.q);
        var ri:number = Math.round(this.r);
        var si:number = Math.round(this.s);
        var qdiff:number = Math.abs(qi-this.q);
        var rdiff:number = Math.abs(ri-this.r);
        var sdiff:number = Math.abs(si-this.s);

        if (qdiff > rdiff && qdiff > sdiff) {
            qi = -ri - si;
        }
        else if (rdiff > sdiff) {
            ri = -qi - si;
        }
        else {
            si = -qi - ri;
        }
        return new Hex(qi,ri,si);
    }

    public linearInt(b:Hex, t:number):Hex {
        return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
    }

    public linedraw(b:Hex):Hex[] {
        var N:number = this.distance(b);
        var aNudge:Hex = new Hex(this.q + 1e-06, this.r + 1e-06, this.s - 2e-06);
        var bNudge:Hex = new Hex(b.q + 1e-06, b.r + 1e-06, b.s - 2e-06);
        var results:Hex[] = [];
        var step:number = 1.0/Math.max(N,1);

        for (var i = 0; i <= N; i++) {
            results.push(aNudge.linearInt(bNudge, step * i).round());
        }
        return results;
    }
}

export class Orientation {
    constructor (public f0:number, public f1:number, public f2:number, public f3:number, public b0:number, public b1:number, public b2:number, public b3:number, public startAngle:number){}
}

export class Layout {
    constructor (public orientation:Orientation, public size:Point, public origin:Point) {}

    public static pointy:Orientation = new Orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0,0.0,3.0/2.0, Math.sqrt(3.0)/ 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5);

    public static flat:Orientation = new Orientation(3.0 / 2.0,  0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0);

    public hexToPixel(h:Hex):Point {
        var M:Orientation = this.orientation;
        var size:Point = this.size;
        var origin:Point = this.origin;
        var x:number = (M.f0 * h.q + M.f1 * h.r) * size.x;
        var y:number = (M.f2 * h.q + M.f3 * h.r) * size.y;
        return new Point(x + origin.x, y + origin.y);
    }

    public pixelToHex(p:Point):Hex {
        var M:Orientation = this.orientation;
        var size:Point = this.size;
        var origin:Point = this.origin;
        var pt:Point = new Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y);
        var q:number = M.b0 * pt.x + M.b1 * pt.y;
        var r:number = M.b2 * pt.x + M.b3 * pt.y;
        return new Hex(q,r,-q - r);
    }

    public hexCornerOffset(corner:number):Point {
        var M:Orientation = this.orientation;
        var size:Point = this.size;
        var angle:number = 2.0 * Math.PI * (M.startAngle - corner) / 6.0;
        return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
    }

    public polygonCorners(h:Hex):Point[] {
        var corners:Point[] = [];
        var center:Point = this.hexToPixel(h);
        for (var i = 0; i < 6; i++) {
            var offset:Point = this.hexCornerOffset(i);
            corners.push(new Point(center.x + offset.x, center.y + offset.y))
        }
        return corners;
    }
}

class Tests {
    constructor() {}

    public static equalHex(name:String, a:Hex, b:Hex):void {
        if (!(a.q === b.q && a.s === b.s && a.r === b.r)) {
            complain(name);
        }
    }

    public static equalInt(name:String, a:number, b:number):void {
        if (!(a === b)) {
            complain(name);
        }
    }

    public static equalHexArray(name:String, a:Hex[], b:Hex[]):void {
        Tests.equalInt(name, a.length, b.length);

        for (var i = 0; i < a.length; i++) {
            Tests.equalHex(name, a[i], b[i]);
        }
    }

    public static testHexArithmetic():void {
        Tests.equalHex("hex_add", new Hex(4,-10,6), new Hex(1,-3,2).add(new Hex(3,-7,4)));
        Tests.equalHex("hex_subtract", new Hex(-2,4,-2), new Hex(1,-3,2).subtract(new Hex(3,-7,4)));
    }

    public static testHexDirection():void {
        Tests.equalHex("hex_direction", new Hex(0,-1,1), Hex.direction(2));
    }

    public static testHexNeighbor():void {
        Tests.equalHex("hex_neighbor", new Hex(1,-3,2), new Hex(1,-2,1).neighbor(2));
    }

    public static testHexDiagonal():void {
        Tests.equalHex("hex_diagonal", new Hex(-1,-1,2), new Hex(1,-2,1).diagonalNeighbor(3));
    }
    public static testHexDistance():void {
        Tests.equalInt("hex_distance", 7, new Hex(3,-7,4).distance(new Hex(0,0,0)));
    }

    public static testHexRotateRight():void {
        Tests.equalHex("hex_rotate_right", new Hex(1,-3,2).rotateRight(), new Hex(3,-2,-1));
    }

    public static testHexRotateLeft():void {
        Tests.equalHex("hex_rotate_left", new Hex(1,-3,2).rotateLeft(), new Hex(-2,-1,3));
    }

    public static testHexRound():void {
        var a:Hex = new Hex(0.0, 0.0, 0.0);
        var b:Hex = new Hex(1.0, -1.0, 0.0);
        var c:Hex = new Hex(0.0, -1.0, 1.0);
        Tests.equalHex("hex_round 1", new Hex(5, -10, 5), new Hex(0.0, 0.0, 0.0).linearInt(new Hex(10.0, -20.0, 10.0), 0.5).round());
        Tests.equalHex("hex_round 2", a.round(), a.linearInt(b, 0.499).round());
        Tests.equalHex("hex_round 3", b.round(), a.linearInt(b, 0.501).round());
        Tests.equalHex("hex_round 4", a.round(), new Hex(a.q * 0.4 + b.q * 0.3 + c.q * 0.3, a.r * 0.4 + b.r * 0.3 + c.r * 0.3, a.s * 0.3 + b.s * 0.3 + c.s * 0.4).round());
        Tests.equalHex("hex_round 5", c.round(), new Hex(a.q * 0.3 + b.q * 0.3 + c.q * 0.4, a.r * 0.3 + b.r * 0.3 + c.r * 0.4, a.s * 0.3 + b.s * 0.3 + c.s * 0.4).round());
    }

    public static testHexLinedraw():void {
        Tests.equalHexArray("hex_linedraw", [new Hex(0, 0, 0), new Hex(0, -1, 1), new Hex(0, -2, 2), new Hex(1, -3, 2), new Hex(1, -4, 3), new Hex(1, -5, 4)], new Hex(0, 0, 0).linedraw(new Hex(1,-5, 4)));
    }

    public static testLayout():void {
        var h:Hex = new Hex(3, 4, -7);
        var flat:Layout = new Layout(Layout.flat, new Point(10.0, 15.0), new Point(35.0, 71.0));
        Tests.equalHex("layout", h, flat.pixelToHex(flat.hexToPixel(h)).round());
        var pointy:Layout = new Layout(Layout.pointy, new Point(10.0, 15.0), new Point(35.0, 71.0));
        Tests.equalHex("layout", h, pointy.pixelToHex(pointy.hexToPixel(h)).round());
    }

    public static testAll():void {
        Tests.testHexArithmetic();
        Tests.testHexDirection();
        Tests.testHexNeighbor();
        Tests.testHexDiagonal();
        Tests.testHexDistance();
        Tests.testHexRotateRight();
        Tests.testHexRotateLeft();
        Tests.testHexRound();
        Tests.testHexLinedraw();
        Tests.testLayout();
    }
}

function complain(name) {
    console.log("FAIL", name);
}
Tests.testAll();