-- Las 12 fuentes del Excel "CARPETA DE DRIVES Y DROPBOX.xlsx" (Hoja1, filas con datos).
-- Se puede correr varias veces: actualiza los datos del Excel pero nunca el
-- estado, la última revisión ni el historial de la fuente.
-- Piloto: el agente propone borradores solo para F-0008 y F-0010; las demás
-- solo se revisan. Para sumar una fuente, activa "Agente" en /admin/fuentes.

insert into public.fuentes (id, proveedor, alcance, plataforma, url, contacto, responsable, notas, agente_activo) values
  ('F-0001', 'Concepto Master Broker', 'Departamentos', 'Dropbox',
   'https://www.dropbox.com/scl/fo/i5jn0e5l4wultid2t33y9/AKZ_TNPDkceYB1PIXiq7JBE?rlkey=s6s12gq1txowbejeupb906a8f&dl=0',
   null, 'Rosy', null, false),
  ('F-0002', 'Concepto Master Broker', 'Terrenos', 'Dropbox',
   'https://www.dropbox.com/scl/fo/6kupv6h4dwan3qomteahu/AArTgoxig1pITkqIfQM-aPY?rlkey=6r3it7xi32u0sxw88d2yiiwj6&dl=0',
   null, 'Rosy', null, false),
  ('F-0003', 'Concepto Master Broker', 'Casas y Town House', 'Dropbox',
   'https://www.dropbox.com/scl/fo/nxfqlhjhko96tzi7ra1dr/ABnm9lokUv0UtgdLoZ8Q2CA?rlkey=wvb3ofbjojetxt3g33ioe5p1e&dl=0',
   null, 'Rosy', null, false),
  ('F-0004', 'Concepto Master Broker', 'Locales y Consultorios', 'Dropbox',
   'https://www.dropbox.com/scl/fo/22wsvnvke4keempk75jen/ADCsVE5P3dD3F9TBWwvFRd8?rlkey=ryttb3yg16tbka177ua1679ld&dl=0',
   null, 'Rosy', null, false),
  ('F-0005', 'AQ Proyectos', null, 'Google Drive',
   'https://drive.google.com/drive/folders/1QYAVzHDhTp0BDekqiAK53Hs1orpfm362',
   '9992505416', null, null, false),
  ('F-0006', 'MELD Master Broker', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/1vjvzGhvxh_Dk-HFWBPMwXU0XZJtlyOTw',
   '9992505780', 'Jhony', null, false),
  ('F-0007', 'Calume Desarrollos', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/1MtNqoC8MFGz3PolXJ-AtZ82LVn5GpFn0',
   '9992332340', null, null, false),
  ('F-0008', 'Parners Master Broker', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/1M_zyLjMDGoaHsk1IA6Y5Q7AHtyi86Z3L',
   null, null, null, true),
  ('F-0009', 'Legiona Master Broker', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/1tzE_WS6EYu-IY5a_nofdhXOA6tFv9Dgr',
   '9992398062', 'Yolanda Aguilera', null, false),
  ('F-0010', 'Desarrollos Capital', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/1J5ESMU-ScIlHzqiTDkk3Nux1HUX5cMBm',
   '9995281659', 'Alex Pinto', 'Casas Sakche, Kinora, Arvum, Solara, Lusso', true),
  ('F-0011', 'Luna Vistas Exclusivas', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/12_UgBcFD5rx1ZGY9VCTuq61mBsSl9bCI',
   '9991624395', 'Lilian Belvain', 'Casas en el Centro, Montecarlo, departamentos, etc.', false),
  ('F-0012', 'Yucatán City Master Broker', 'Varios', 'Google Drive',
   'https://drive.google.com/drive/folders/10gO5b5FBf_pYvhrIEceMWAI_GxRHqj_9',
   '9999005826', 'Jacobo', null, false)
on conflict (id) do update set
  proveedor   = excluded.proveedor,
  alcance     = excluded.alcance,
  plataforma  = excluded.plataforma,
  url         = excluded.url,
  contacto    = excluded.contacto,
  responsable = excluded.responsable,
  notas       = excluded.notas;
