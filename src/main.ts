import { Aurelia } from 'aurelia-framework';


export async function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
    .developmentLogging();

  aurelia.use.plugin("aurelia-materialize-bridge", (b: any) => b.useAll().preventWavesAttach());

  await aurelia.start();
  await aurelia.setRoot("src/app");
}
