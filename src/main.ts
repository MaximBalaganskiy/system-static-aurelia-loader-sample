import "materialize";
import { Aurelia } from 'aurelia-framework';
import { PLATFORM } from "aurelia-pal";

export async function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
    .developmentLogging();

  aurelia.use.plugin("aurelia-materialize-bridge", (b: any) => {
    b.useAll();
    if ((<any>PLATFORM).$__SystemStaticAureliaLoader) {
      b.preventWavesAttach();
    }
  });

  await aurelia.start();
  await aurelia.setRoot("src/app");
}
