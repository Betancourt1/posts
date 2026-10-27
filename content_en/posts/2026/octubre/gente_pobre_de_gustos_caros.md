---
title: "Gente pobre de gustos caros"
date: 2026-10-23
draft: true
tags: []
summary: "O de por qué los jóvenes pueden tener viajes pero no pensión"
hidden: true
essay: true
pinned: true
technical: false
---

> La mirada generacional desmoviliza. Si soy el recipiente vacío de un destino histórico, es más fácil que vea mi situación como inevitable. Si la pregunta es a quién le fue mejor, si a nuestros padres o a nosotros, es natural que nos sepamos derrotados. Si medimos nuestro bienestar basándonos en lo que se consideraba una vida buena hace treinta años, es más posible que nuestras conclusiones no puedan dejar de ser reaccionarias.
>
> Eudald Espluga en _No seas tú mismo_
## Introducción
Durante mi —ya larga— juventud he escuchado muchas veces una narrativa sobre la generación millennial[^note-1] que me resulta problemática. Esta siempre tiene más o menos los siguientes elementos:
1. Los milennials atraviesan una crisis de [pensiones, vivienda, desempleo, natalidad, you name it].
2. Los milennials tienen el hábito de [comprar cafés de starbucks, viajar, estudiar ciertas carreras, tener muchas mascotas].
3. Este hábito es la explicación de su crisis.
4. La crisis es culpa suya.
Ejemplos de esta narrativa hay a montones. Por citar un solo ejemplo, muestro este [tweet](https://x.com/leonpalafox/status/2113637595913580638) que, de hecho, fue el que motivó que escribiera todo esto:

![Gente pobre de gustos caros](/uploads/2026/10/screenshot-2026-10-24-at-22-42-17-leon-palafox-on-x-los-mismos-milenials-que-se-quejan-de-que-no-se-van-a-retirar-con-una-pension-digna-son-los-mismos-que-cada-ano-te-mandan-fotos-de-2-3-viajes-internacionales-el-carro-nuevo-o-la-ropa-de-marca-e-1792903349053.png)

Estas estructuras argumentativas surgen de vez en vez, cada una enfocándose en una crisis diferente y abordarlas todas en un solo lugar es irreal. En este ensayo me voy a ocupar exclusivamente de la versión que el señor León Palafox  tuvo a bien expresar en Twitter.[^note-2] 

Cabe hacer una aclaración: no tengo idea de con qué millennials se intercambia fotos el señor Palafox y desconozco si la preocupación de esos jóvenes es si se van a pensionar (espero de corazón que no). No pretendo atribuirle mala fe, desacreditarlo ni dar a entender que lo que dice no nace de una experiencia real. Él puede estar siendo perfectamente razonable y sincero sin que eso signifique que su consigna se aplica homogéneamente en toda la población que se engloba dentro de lo _millennial_. 

Ahora bien, es difícil falsar afirmaciones tan generales como las que hace en su tweet porque no hay un registro nacional y abierto de quiénes viajan, compran carros nuevos o ropa de marca. Así que tenemos que poner estas consignas en términos que, más o menos, podamos analizar en el resto de la población. Otro constraint que tenemos es espacial: no tengo idea de por dónde empezar a investigar esto en otros países y tengo la sensación de que el aporte no será tan interesante. Por lo tanto, me concentraré en México y provisionalmente recurriré a literatura estadounidense para apoyarme a justificar nociones que yo mismo no tenga del todo claras sobre economía. 

¿Qué datos tenemos a la mano entonces? Para este caso, usaré el ENIGH (encuesta nacional de ingresos y gastos de los hogar) y el ENSAFI (encuesta nacional sobre salud financiera), ambos del INEGI. Además, es difícil atribuir a si una conducta se da en cierto grupo etario debido a un factor mayoritariamente etario o si la época en la que se hacen las observaciones es igual de relevante. Es decir, no sabemos si los millennials se comportan de cierta forma porque son millennials o solamente porque son jóvenes. Por ello, analizaré distintas versiones del ENIGH para comparar adecuamente a los distintos grupos etarios. Entonces, nuestro universo de análisis queda tal que así:

| Fuente | Año | Universo analizado | Ponderador |
|---|---|---|---|
| ENIGH histórica, INEGI | 1994, 2004, 2014 | 12,508; 22,565; 19,463 hogares con jefatura adulta, respectivamente | `HOG` / `factor_hog` |
| ENIGH Nueva Serie, INEGI | 2024 | 91,380 hogares con jefatura de 18 años o más, de 91,414 en la fuente | `factor` |
| ENSAFI, INEGI/CONDUSEF | 2023 | 20,448 personas de 18 años o más | `FAC_ELE` |

Una limitación importante del ENIGH es que solamente nos habla de la edad que tiene el jefe de cada hogar. Si alguien de 25 vive en un hogar cuyo jefe tiene 55, nos sería imposible separar su gasto del resto de su hogar. Por esto, tomemos estos datos como lo que son: una estimación probable de cómo se puede llegar a ver el gasto real de los millennials.

A partir del tweet que vamos a analizar, y poniéndolo en un lenguaje que podamos contrastar contra nuestro universo de datos, podemos plantear cinco hipótesis:

- **H1** Los millennials destinan una mayor proporción de su ingreso a gastos no básicos.
- **H2** La diferencia persiste entre hogares de ingreso similar.
- **H3** Ese gasto se financia con deuda o desahorro.
- **H4** Hay desventajas de vivienda y pensión y las quejas son infundadas.
- **H5** El gasto visible se concentra en una minoría.

Cuando sea posible, contrastaremos cada hipótesis con su evolución a través de distintas ediciones de la misma encuesta [^note-3]. 

## H1: Los millenials gastan más cosas en no básicas
### Disclaimer
Es raro hablar de gastos no básicos. El mismo gasto puede resultar necesario para una persona y no serlo para muchas otras (por ejemplo una computadora o un viaje). Vamos a tener que hacer un acuerdo al respecto, una licencia, digamos. En esta sección, y en las siguientes, cuando sea relevante, nos apegaremos a esta clasificación de gastos:

| Canasta | Qué reúne | Para qué sirve |
|---|---|---|
| D1 | Una selección amplia que incluye transporte, comunicaciones, equipamiento del hogar y otras categorías | Ver qué ocurre con una definición más amplia |
| D2 | Restaurantes y hoteles, recreación, alcohol/tabaco, ciertos accesorios, algunas categorías digitales y automóvil nuevo | Es la medida principal de «gasto visible» |
| D3 | Alcohol, tabaco y narcóticos | Examinar una selección mucho más restringida |

Esto nos va a ayudar a evaluar cómo distintos significados de _gasto innecesario_ cambian el análisis. 

### Tipo de gasto por edad
Entrando en materia, ¿los jóvenes parecen gastar más dinero en bienes no esenciales con respecto a gente de otras edades? Sí, los hogares con un jefe entre 18 y 29 años gastan una mayor proporción de sus ingresos en gastos no esenciales. El porcentaje de diferencia varía de acuerdo a la canasta que elijamos, pero la diferencia se encuentra en torno a un 4.2% con respecto a los hogares con un jefe de 60+ años. La diferencia más marcada se ve cuando contemplamos como canasta a D3, donde los otros tres grupos etarios son prácticamente iguales salvo el grupo de menor edad. 

![Gente pobre de gustos caros](/uploads/2026/10/h1-composicion-por-edad-1793045635209.png)

Si bien podemos acordar que la diferencia existe (aunque no hemos probado que es **estadísticamente significativa**), cabe preguntar en dónde se concentra esa diferencia una vez desagregamos la canasta por tipo de gasto. 

![Gente pobre de gustos caros](/uploads/2026/10/h1-componentes-d2-1793045028583.png)

Al descomponer esa diferencia:

- Restaurantes y hoteles aportan 2.70 puntos.
- Recreación aporta 1.17 puntos.

Juntos suman aproximadamente el 91% de la brecha. Además de esto, podemos ver que son las familias cuyo jefe tiene entre 30-44 años quienes dedican más recursos a recreación. Buena parte de ese segmento poblacional encaja en la categoría millennial. Si hablamos de comprar automóvil nuevo, pareciera que el dato tiene demasiada incertidumbre en el rango de edad 18-29, así que es difícil hacer afirmaciones al respecto. 

Hasta ahora, parece relativamente sólida la afirmación de que nuestra primer hipótesis es cierta. Las personas jóvenes tienden a gastar más de sus recursos en cosas no esenciales como viajes, restaurantes, hoteles y otro tipo de recreación. Cabe preguntarnos, no obstante, si esto se debe a que son millennials o se debe a que son jóvenes[^note-4]. Una forma de contrastar este matiz es ver cómo los distintos grupos etarios se han comportado en edicionas pasadas de la misma encuesta. Esto nos permite formular una hipótesis más general que H1 a la que denominaremos **H1c**.

### H1c: Los millennials gastan más por millennials que por jóvenes

Queremos asegurarnos de que, al estudiar las diferencias estadísticas entre grupos de individuos, no estamos atribuyendo erróneamente esas diferencias. Como es bien sabido, correlación no implica causalidad. Por esto, vale la pena ver qué realidad detectaron ediciones pasadas de la encuesta ENIGH. 

![Gente pobre de gustos caros](/uploads/2026/10/h1-historico-edades-1793075812301.png)

En 1994, los jóvenes jefes de hogar gastaron un 9.6% de su total de gastos en la canasta D2 en comparación a un 5.1% del grupo con más edad, una observación similar a la última encuesta levantada. Además, consistentemente cada grupo de edad se ha comportado de manera similar en lo que respecta a su incremento en gasto a través de los años. Con estos datos, podemos ver que los millennials parecen comportarse como cualquier otro grupo de su misma edad en décadas anteriores. 

![Gente pobre de gustos caros](/uploads/2026/10/h1-historico-comparacion-1793075802837.png)

Una cosa en la que los jóvenes pareciera que gastan significativamente más es en restaurantes, mientras que su gasto en viajes es más o menos el mismo o incluso ligeramente menor al de décadas anteriores. 

![Gente pobre de gustos caros](/uploads/2026/10/h1-historico-quintiles-1793075842462.png)

Como ya vimos, los datos que analizamos antes tienen un problema difícil de afrontar: están agregados por hogar. Esto significa que algunos de los gastos que corresponderían a un millennial podrían agregarse en hogares cuyo jefe pertenece a otro grupo de edad. Para intentar salvar esta distancia, vamos a recurrir al ENSAFI 2023, una encuesta sobre los hábitos financieros que sí está agregada a nivel de inidividuo. De este dataset podemos redactar una hipótesis más débil que H1 pero que podemos aspirar a responder con ese dataset. La denominaremos **H1b**.

### H1b: Los millennials gastan más en celular, internet, streaming y autómovil

A primera vista, la hip

![Gente pobre de gustos caros](/uploads/2026/10/h1b-bienes-ensafi-1793075972695.png)

![Gente pobre de gustos caros](/uploads/2026/10/h1b-comparaciones-edad-1793075981038.png)

![Gente pobre de gustos caros](/uploads/2026/10/h1b-historico-bienes-1793075991491.png)



[^note-1]: En este ensayo asumiré el término millennial como sinónimo de persona por encima de sus veintitantos años y debajo de los cuarenta. El término es problemático y amerita una discusión que se puede leer mejor en otros lados; un buen ejemplo es el libro _No seas tú mismo_ de Eudald Espluga que cito al inicio. Por favor perdonen la licencia.

[^note-2]: Puedo ofrecer, no obstante, sugerencias de lectura para otras formas similares. Por ejemplo, para la variante que habla de la crisis de vivienda pueden leer el capítulo 5 de _Pobres porque quieren_, de Máximo Jaramillo; para la crisis de natalidad, _The Birth Strike_, de Jenny Brown; y para la precariedad laboral, los primeros dos capítulos de _The Precariat_, de Guy Standing.

[^note-3]: Nadie se baña dos veces en el mismo río. Hay que tener en cuenta que es difícil hablar de _comparación_ en estas condiciones. La gente que tiene 30 años ahora se enfrenta a distintos retos socio-económicos y culturales que alguien que tuvo 30 años en 1984. Más aún, incluso si medimos una variable aparentemente idéntica en esos dos grupos —como cuánto gastan en restaurantes— es difícil defender que se está midiendo la misma conducta, pues esta puede responder a distintos incentivos y limitaciones.

[^note-4]: Es retador hacer esta clase de comparaciones intergeneracionales. ¿Es un joven de 20 años en 2004 equiparable a un joven de 20 años ahora? Diría que la comparación es algo injusta. Pero veremos que nos sirve para un propósito.
