var LST_Process = function(x) {
  /* Mask LST with the QA band (*1) removing:
      - LST not produced (cloud effects and other reasons)
      - LST affected by thin cirrus and/or sub-pixel clouds
      - LST not processed due to missing pixels and due poor quality
      - average emissivity error > 0.04
      - average LST error > 3K
    
  More information in Table 13 (*2). Bit flags defined for SDSs QC_day and QC_Night in MOD11A1.
    *1 https://lpdaac.usgs.gov/documents/715/MOD11_User_Guide_V61.pdf
    *2 https://icess.eri.ucsb.edu/modis/LstUsrGuide/usrguide_1dtil.html#qa
  Note: to run this script in Google Earth Engine plataform, it's necessary to modify the lines 30 & 31, changing "None" (python) for "null"(js), and "True" for "true"
  */
  x = x.clip(ROI);
  var QC_Day = x.select('QC_Day');
  var QC_mask_Day = ee.Image(0);
  var QC_Night = x.select('QC_Night');
  var QC_mask_Night = ee.Image(0);
  var QC_Cloud_Cover_Day = QC_Day.eq(2); // Day Cloud mask bit 00000010: "LST not produced due to cloud effects"

  // Quality mask 
  for (var i = 0; i < 10; i++) { // a compact way in stead of write QC_Day.eq(0).or(QC_Day.eq(64)...)
    QC_mask_Day = QC_mask_Day.add(QC_Day.eq([0, 64, 128, 1, 65, 129, 16, 80, 17, 81][i]));
    QC_mask_Night = QC_mask_Night.add(QC_Night.eq([0, 64, 128, 1, 65, 129, 16, 80, 17, 81][i]));
  } // note that .or in gee libary doesn't works, so i've add all bands and then compute the filter .gte(1)
  QC_mask_Day = QC_mask_Day.gte(1)
  QC_mask_Night = QC_mask_Night.gte(1)

  // masking, scaling, temperature unit transform (K to Celsius) and replacing the original band
  x = x.addBands((x.select('LST_Day_1km').multiply(0.02).subtract(273.15).updateMask(QC_mask_Day)))//, None, True); // Apply mask over Days temperatures
  x = x.addBands((x.select('LST_Night_1km').updateMask(QC_mask_Night).multiply(0.02).subtract(273.15)))//, None, True); // Apply mask over Nights temperatures
  var mask = (QC_mask_Night.multiply(QC_mask_Night)).rename('mask'); // combining the Day and Night Temperature

  // Day - Night Temperature Difference
  var Difference = x.select('LST_Day_1km').subtract(x.select('LST_Night_1km')).rename('Day_Night_Diff');
  x = x.addBands(Difference);
  x = x.addBands(mask); //.copyProperties(x)
  x = x.addBands(QC_mask_Night.rename('QC_Night_mask'));
  x = x.addBands(QC_mask_Day.rename('QC_Day_mask'));
  x = x.addBands(QC_Cloud_Cover_Day.rename('Cloud_Cover_mask'));
  //x = x.addBands(QC_mask_Day.multiply(QC_Cloud_Cover_Day).rename('Improvement_QMask'))
  return x.copyProperties(x); //
}

  // export function
  exports.LST_Process = LST_Process
