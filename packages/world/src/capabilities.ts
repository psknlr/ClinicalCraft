/**
 * The capability groups of the spatial policy (EMBODIED §6) — shared by the
 * policy (`policy.ts`), the selection of a workstation's or device's case
 * item (`clinical.ts`) and the bedside rhythm rule (`runtime.ts`).
 */

/**
 * Capabilities of tests done on the patient with a device at the bedside
 * (order_test → bedside-provider, or a fixed station; read_result → at the
 * patient or a records terminal, never the device).
 */
export const BEDSIDE_CAPABILITIES: readonly string[] = ["ecg-12lead", "point-of-care", "ultrasound", "echocardiography", "peak-flow", "scale", "cardiac-monitor", "capnography", "oxygen", "suction", "eeg", "fetal-monitor"];

/**
 * Laboratory capabilities: the specimen is taken at the patient and sent to
 * the laboratory (pneumatic tube) — ordering needs the sample, never a walk
 * to the laboratory; results are read on any records terminal.
 */
export const LAB_CAPABILITIES: readonly string[] = ["lab-hematology", "lab-chemistry", "lab-blood-gas", "lab-serology", "lab-microbiology", "lab-urinalysis", "lab-endocrine", "flow-cytometry", "blood-bank"];

/**
 * Laboratory capabilities whose sample is blood — drawn when the case's
 * IV-access procedure is done (its bloods): afterwards the order can be
 * entered at a records terminal or a laboratory station without returning
 * to the patient. Urine is collected at the patient.
 */
export const BLOOD_SAMPLE_CAPABILITIES: readonly string[] = LAB_CAPABILITIES.filter((c) => c !== "lab-urinalysis");

/**
 * Capabilities whose goods are delivered to the bedside: pharmacy-dispensed
 * drugs and blood products. An intervention that needs them needs an
 * in-service provider somewhere in the facility (a pharmacy, a blood bank
 * fridge), never one at the bedside — the actor stays at the patient.
 */
export const DELIVERED_CAPABILITIES: readonly string[] = ["medications", "blood-bank"];

/**
 * Default bedside capabilities of an intervention kind whose `requires` is
 * empty (an unlisted kind: none): oxygen needs an oxygen source, monitoring
 * a monitor, a fluid IV access, an airway procedure airway equipment.
 */
export const KIND_DEFAULT_CAPABILITIES: Readonly<Record<string, readonly string[]>> = { oxygen: ["oxygen"], monitoring: ["cardiac-monitor"], fluid: ["iv-access"], airway: ["airway"] };

/** IV access: patient state (the case's IV-access procedure), not equipment at the bedside — except for that procedure itself. */
export const IV_ACCESS_CAPABILITY = "iv-access";

/** The chart and order entry: a station with this capability. */
export const CHART_CAPABILITY = "records";

/** Capabilities that show the heart rhythm at the bedside: a monitor (or monitor-defibrillator), an ECG machine, a defibrillator. */
export const RHYTHM_CAPABILITIES: readonly string[] = ["cardiac-monitor", "ecg-12lead", "defibrillator"];


/**
 * Capabilities of studies done ON the patient at a fixed device (review G8): CT, MRI, a fixed X-ray machine,
 * fluoroscopy, PET-CT, endoscopy — the patient is brought to the device (`patient-at-provider`), unless the
 * investigation is authored `performedAt: "bedside"` (a portable chest X-ray: a mobile unit comes to the bed).
 */
export const PATIENT_AT_PROVIDER_CAPABILITIES: readonly string[] = ["ct", "mri", "xray", "fluoroscopy", "pet-ct", "endoscopy"];

/** Capabilities of patient-performed tests at a fixed station (peak flow, weight): the patient goes to the station. */
export const PATIENT_PERFORMED_CAPABILITIES: readonly string[] = ["peak-flow", "scale"];

/** Capabilities whose device has its own patient table (the patient lies on the device itself). */
export const TABLE_CAPABILITIES: readonly string[] = ["ct", "mri", "pet-ct", "xray"];

/** Equipment types a patient is wheeled on: the bed travels with them (a hospital bed, a stretcher). */
export const TROLLEY_TYPES: readonly string[] = ["hospital-bed", "stretcher"];
