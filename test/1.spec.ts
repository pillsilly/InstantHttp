/**
 * @jest-environment jsdom
 */

const TEXT_CONTENT = "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Typi non habent claritatem insitam; est usus legentis in iis qui facit eorum claritatem. Investigationes demonstraverunt lectores legere me lius quod ii legunt saepius. Claritas est etiam processus dynamicus, qui sequitur mutationem consuetudium lectorum. Mirum est notare quam littera gothica, quam nunc putamus parum claram, anteposuerit litterarum formas humanitatis per seacula quarta decima et quinta decima. Eodem modo typi, qui nunc nobis videntur parum clari, fiant sollemnes in futurum.";
const FILENAME = "lorem.txt";
import Deflate from "@zip.js/zip.js/lib/core/streams/codecs/deflate.js";
import Inflate from "@zip.js/zip.js/lib/core/streams/codecs/inflate.js";
import { configure } from "@zip.js/zip.js/lib/zip-no-worker";
import * as fs from 'fs';


// avoid webapi as possible as it can
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "../node_modules/@zip.js/zip.js/lib/zip-no-worker";


configure({ Deflate, Inflate, useWebWorkers: false });
console.log(Uint8ArrayWriter)
describe('Test bin.js', function () {

  it('should 55', async () => {
    const rr = navigator.userAgent;
    const ARRAY = new Uint8Array(Array.from(TEXT_CONTENT).map(character => character.charCodeAt(0)));
    const arrayWriter = new Uint8ArrayWriter();
    const zipWriter = new ZipWriter(arrayWriter);
    await zipWriter.add(FILENAME, new Uint8ArrayReader(ARRAY));
    await zipWriter.close();
    const zipReader = new ZipReader(new Uint8ArrayReader(arrayWriter.getData()));
    const entries = await zipReader.getEntries();
    const data = await entries[0].getData(new Uint8ArrayWriter());
    fs.writeFileSync('1.txt',data);
    await zipReader.close();
  });
});
