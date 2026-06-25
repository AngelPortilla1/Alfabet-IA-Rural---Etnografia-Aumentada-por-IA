# Modelo mental, incertidumbre y agrupamiento

## Modelo mental individual

Cada participante/perfil se representa como:

```text
Mi = (Gi, vi, li, qi)
```

- `Gi`: grafo causal percibido con nodos, aristas, relación, polaridad, peso, evidencia e incertidumbre.
- `vi`: valores/preocupaciones normalizadas en [0,1], por ejemplo sensibilidad de datos o preocupación por sesgo.
- `li`: perfil composicional de alfabetización en dominios C1-C6 (base). El dominio C7 (*soberanía tecnológica rural*) se añade dinámicamente cuando el código `digital_distrust` está activo.
- `qi`: preferencias de canal y mediación.

## Evidencia directa vs inferida

- La evidencia directa es cita o fragmento permitido de un evento consentido.
- La evidencia inferida es una propuesta analítica del sistema o del LLM.
- Ninguna inferencia LLM se almacena como evidencia primaria.
- Cada código y arista conserva `EvidenceRef` con tipo, hash, confianza e incertidumbre.

## Actualización de aristas

Si llega nueva evidencia para la misma relación `(source,target,relation)`, el sistema actualiza peso e incertidumbre por promedio incremental ponderado por soporte. Si aparece polaridad incompatible, se marca `ContradictionFlag` y AFAIR puede exigir revisión.

## Incertidumbre

La incertidumbre se descompone por fuente:

- transcripción;
- normalización;
- codificación;
- contradicción;
- falta de evidencia;
- sensibilidad.

Los umbrales están en `data/policies_seed.yaml` y deben calibrarse durante el piloto.
Ver `docs/CODEBOOK_Y_CURRICULUM.md` para la tabla completa de parámetros y sus valores actuales.

## Distancia híbrida

El agrupamiento usa:

```text
d(i,j)=alpha*dG(Gi,Gj)+beta*||vi-vj||+gamma*dFR(li,lj)
```

- `dG`: sustituto transparente de distancia de edición de grafo: Jaccard de nodos/aristas + diferencia de pesos + cambio de polaridad.
- `||vi-vj||`: distancia euclídea normalizada entre valores.
- `dFR`: distancia Fisher-Rao para composiciones de alfabetización.

## Calibración y sensibilidad

Los pesos por defecto son `alpha=0.45`, `beta=0.30`, `gamma=0.25`. No son universales. Deben reportarse con matriz de sensibilidad:

1. variar cada peso ±20%;
2. observar estabilidad de segmentos;
3. revisar segmentos con facilitadores;
4. documentar cambios de etiqueta y centroides.

## Baja densidad y cobertura sesgada

Con pocos modelos, los segmentos son hipótesis de arranque. AFAIR añade alerta si hay baja densidad o subrepresentación por canal. Ningún segmento debe convertirse en etiqueta fija de personas.
