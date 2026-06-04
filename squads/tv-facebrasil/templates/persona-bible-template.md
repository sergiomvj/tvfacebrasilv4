# TV FaceBrasil — Persona Bible Template

Use this file as the fixed visual identity block for AI video prompts.
Keep one Persona Bible per recurring presenter.

## Metadata

- Persona ID: `facebrasil-presenter-01`
- Version: `0.1`
- Owner: `TV FaceBrasil`
- Use case: `vertical news shorts, 9:16`
- Status: `draft`

## Persona Base

```text
A Brazilian news presenter in her early 30s, medium tan skin, oval face,
dark brown almond-shaped eyes, symmetrical facial features, natural eyebrows,
long straight dark brown hair parted slightly to the left, shoulder-length to
mid-chest, natural professional makeup, warm but composed expression.

She wears a navy blue blazer over a crisp white blouse, small discreet silver
earrings, no necklace, no distracting accessories. She stands upright with a
calm, professional posture, facing the camera directly like a modern digital
news anchor.
```

## Wardrobe Lock

```text
Always keep the same outfit style: navy blue blazer, white blouse, discreet
silver earrings. Keep the clothing clean, professional, modern, and consistent.
Do not change to casual clothes, dresses, hats, uniforms, bright colors, heavy
jewelry, or branded apparel.
```

## Face And Body Consistency

```text
Keep the same age, ethnicity, face shape, facial proportions, skin tone, eye
color, hair color, hair length, hairstyle, body type, and presenter identity
across every generation.
```

## Presentation Style

```text
Calm Brazilian Portuguese news delivery, clear articulation, warm but serious
journalistic tone, subtle hand gestures, natural blinking, restrained facial
expressions, no exaggerated emotion, no comedy performance.
```

## Scene Base

```text
Modern clean newsroom background, soft studio lighting, shallow depth of field,
neutral blue and white visual palette, vertical 9:16 composition, presenter in
medium shot from waist or chest up, camera at eye level, stable camera, no shaky
movement.
```

## Negative Consistency Rules

```text
Do not change the presenter into another person. Do not alter ethnicity, age,
face structure, eye color, hair color, hair length, hairstyle, outfit style, or
body type. Do not add glasses unless explicitly requested. Do not add hats,
scarves, heavy jewelry, logos, microphones, extra people, cartoon style,
anime style, fantasy style, distorted face, inconsistent hands, extra fingers,
text artifacts, watermarks, or low-quality newsroom backgrounds.
```

## Prompt Composer Template

```text
PERSONA_BASE:
{persona_base}

WARDROBE_LOCK:
{wardrobe_lock}

FACE_AND_BODY_CONSISTENCY:
{face_and_body_consistency}

PRESENTATION_STYLE:
{presentation_style}

SCENE_BASE:
{scene_base}

VIDEO_TASK:
The presenter explains the following FaceBrasil article topic in Brazilian
Portuguese with a calm journalistic delivery:
"{article_topic}"

The video is a vertical 9:16 news short. The presenter should speak naturally,
use subtle hand gestures, maintain eye contact with the camera, and keep the
same identity described above throughout the entire clip.

NEGATIVE_RULES:
{negative_consistency_rules}
```

## Validation Checklist

- [ ] Same face across generations
- [ ] Same hairstyle and hair color
- [ ] Same clothing palette and outfit
- [ ] Same apparent age and ethnicity
- [ ] No extra people
- [ ] No logo/text artifacts
- [ ] Usable 9:16 framing
- [ ] Professional news tone
