xquery version "1.0-ml";

module namespace trns = "http://marklogic.com/rest-api/transform/person-json";

declare function trns:processxml($person as element(person))
{
  let $o := json:object()
  let $_ :=
    for $x in $person/*[fn:not(self::HCPCS_CD_45)]
    let $local-name := fn:local-name($x)
    let $value :=
      if ($local-name = ("AGE", "SALARY")) then
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
