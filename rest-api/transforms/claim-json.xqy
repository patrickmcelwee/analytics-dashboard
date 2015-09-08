xquery version "1.0-ml";

module namespace trns = "http://marklogic.com/rest-api/transform/claim-json";

declare function trns:processxml($claim as element(claim))
{
  let $o := json:object()
  let $_ :=
    for $x in $claim/*[fn:not(self::HCPCS_CD_45)]
    let $local-name := fn:local-name($x)
    let $value :=
      if ($local-name = ("CLM_PMT_AMT", "NCH_PRMRY_PYR_CLM_PD_AMT", "CLM_PASS_THRU_PER_DIEM_AMT", "NCH_BENE_IP_DDCTBL_AMT", "NCH_BENE_PTA_COINSRNC_LBLTY_AM", "NCH_BENE_BLOOD_DDCTBL_LBLTY_AM", "CLM_UTLZTN_DAY_CNT")) then
        xs:decimal($x)
      else
        fn:data($x)
    return
      map:put($o, $local-name, $value)
  return
    xdmp:to-json($o)
};

declare function trns:transform(
  $context as map:map,
  $params as map:map,
  $content as document-node()
) as document-node()
{
  document { trns:processxml($content/*) }
};
