import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
  Sparkles,
  Sprout,
  Stethoscope,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CardShadow,
  HealthBadgeTheme,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
  UrgencyBadgeTheme,
} from "@/constants/theme";
import {
  diagnosePlantHealth,
  identifyPlant,
  isMockAiEnabled,
} from "@/services/aiPlantService";
import { prepareImageForAI } from "@/services/imageUtils";
import { usePlantStore } from "@/store/usePlantStore";
import type {
  LightExposure,
  PlantDiagnosisResult,
  PlantIdentificationResult,
  PotMaterial,
} from "@/types/plant";

type ScanWorkflowMode = "identify" | "diagnose";

const DEMO_PRESETS = [
  {
    label: "Jade Succulent",
    query: "Crassula ovata Jade Plant",
    uri: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Echeveria Rosette",
    query: "Echeveria elegans succulent",
    uri: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Avocado Pit Prop",
    query: "Persea americana Avocado seed propagation",
    uri: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=900&q=80",
  },
];

export default function ScanScreen() {
  const params = useLocalSearchParams<{ mode?: string; plantId?: string }>();
  const plants = usePlantStore((s) => s.plants);
  const entries = usePlantStore((s) => s.entries);
  const addPlant = usePlantStore((s) => s.addPlant);
  const saveHealthAssessment = usePlantStore((s) => s.saveHealthAssessment);

  const [mode, setMode] = useState<ScanWorkflowMode>(
    params.mode === "diagnose" ? "diagnose" : "identify",
  );

  // Shared media state
  const [imageUri, setImageUri] = useState<string>("");
  const [imageDimensions, setImageDimensions] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Workflow 1: Identify & Add Plant state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [idResult, setIdResult] = useState<PlantIdentificationResult | null>(
    null,
  );
  const [nickname, setNickname] = useState<string>("");
  const [location, setLocation] = useState<string>("South Living Room Sill");
  const [hasDrainageHole, setHasDrainageHole] = useState<boolean>(true);
  const [potMaterial, setPotMaterial] = useState<PotMaterial>("terracotta");
  const [lightExposure] = useState<LightExposure>("bright_direct");
  const isLiveAi = useMemo(() => !isMockAiEnabled(), []);

  // Workflow 2: Health Diagnosis state
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    params.plantId || plants[0]?.id || "",
  );
  const [observationNotes, setObservationNotes] = useState<string>(
    "Two lower leaves look slightly yellow and plump after recent waterings.",
  );
  const [diagnosisResult, setDiagnosisResult] =
    useState<PlantDiagnosisResult | null>(null);

  const [prevParams, setPrevParams] = useState({
    mode: params.mode,
    plantId: params.plantId,
  });
  if (
    params.mode !== prevParams.mode ||
    params.plantId !== prevParams.plantId
  ) {
    setPrevParams({ mode: params.mode, plantId: params.plantId });
    if (params.mode === "diagnose") {
      setMode("diagnose");
    }
    if (params.plantId) {
      setSelectedPlantId(params.plantId);
    }
  }

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId) ?? plants[0],
    [plants, selectedPlantId],
  );

  const selectedPlantLogs = useMemo(
    () =>
      entries
        .filter((e) => e.plantId === selectedPlant?.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
    [entries, selectedPlant],
  );

  const handlePickFromLibrary = async () => {
    setErrorMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage(
        "Photo library permission is required to upload a plant photo.",
      );
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!picked.canceled && picked.assets[0]?.uri) {
      const prepared = await prepareImageForAI(picked.assets[0].uri);
      setImageUri(prepared.uri);
      setImageDimensions(
        `${prepared.width}×${prepared.height}px (${prepared.mimeType})`,
      );
      setSearchQuery("");
      setIdResult(null);
    }
  };

  const handleTakePhoto = async () => {
    setErrorMessage(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Camera permission is required to snap a photo.");
      return;
    }

    const snapped = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
    });

    if (!snapped.canceled && snapped.assets[0]?.uri) {
      const prepared = await prepareImageForAI(snapped.assets[0].uri);
      setImageUri(prepared.uri);
      setImageDimensions(
        `${prepared.width}×${prepared.height}px (${prepared.mimeType})`,
      );
      setSearchQuery("");
      setIdResult(null);
    }
  };

  const handleRunIdentification = async () => {
    if (!imageUri && !searchQuery.trim()) {
      setErrorMessage(
        "Please enter a plant name or select/capture a photo first.",
      );
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const result = await identifyPlant(imageUri || searchQuery, searchQuery);
      setIdResult(result);
      setNickname(result.commonName);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to identify plant.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIdentifiedPlant = () => {
    if (!idResult) return;
    const created = addPlant({
      nickname: nickname || idResult.commonName,
      location,
      isIndoor: true,
      lightExposure,
      hasDrainageHole,
      potMaterial,
      photoUri: imageUri || DEMO_PRESETS[0].uri,
      identification: idResult,
    });

    setIdResult(null);
    router.push({
      pathname: "/plant/[id]",
      params: { id: created.id },
    });
  };

  const handleRunHealthDiagnosis = async () => {
    if (!selectedPlant) {
      setErrorMessage("No plant selected for diagnosis.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const diagnosis = await diagnosePlantHealth(
        imageUri || selectedPlant.photoUri,
        selectedPlant,
        selectedPlantLogs,
        observationNotes,
      );
      setDiagnosisResult(diagnosis);
      saveHealthAssessment(
        selectedPlant.id,
        diagnosis,
        imageUri || selectedPlant.photoUri,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to run AI health diagnosis.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxContainer}>
          {/* Screen Title */}
          <View style={styles.headerBlock}>
            <View style={styles.eyebrowRow}>
              <Text style={styles.eyebrow}>MULTIMODAL BOTANICAL AI</Text>
              <View
                style={[
                  styles.engineBadge,
                  isLiveAi ? styles.engineBadgeLive : styles.engineBadgeMock,
                ]}
              >
                <View
                  style={[
                    styles.engineDot,
                    isLiveAi ? styles.engineDotLive : styles.engineDotMock,
                  ]}
                />
                <Text
                  style={[
                    styles.engineBadgeText,
                    isLiveAi
                      ? styles.engineBadgeTextLive
                      : styles.engineBadgeTextMock,
                  ]}
                >
                  {isLiveAi ? "Live Gemini AI" : "Offline Mock"}
                </Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>Add or Scan Plant</Text>
            <Text style={styles.headerSubtitle}>
              Identify a new plant or run a context-aware AI Health Scan
              combining leaf photos with your care timeline.
            </Text>
          </View>

          {/* Workflow Switcher */}
          <View style={styles.segmentedBar}>
            <Pressable
              onPress={() => {
                setMode("identify");
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === "identify" && styles.segmentBtnActive,
              ]}
            >
              <Sprout
                size={16}
                color={
                  mode === "identify"
                    ? Palette.textInverse
                    : Palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  mode === "identify" && styles.segmentBtnTextActive,
                ]}
              >
                1. Identify & Add Plant
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode("diagnose");
                setErrorMessage(null);
              }}
              style={[
                styles.segmentBtn,
                mode === "diagnose" && styles.segmentBtnActive,
              ]}
            >
              <Stethoscope
                size={16}
                color={
                  mode === "diagnose"
                    ? Palette.textInverse
                    : Palette.textSecondary
                }
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  mode === "diagnose" && styles.segmentBtnTextActive,
                ]}
              >
                2. AI Health Scan
              </Text>
            </Pressable>
          </View>

          {/* Photo Capture / Upload & Demo Presets Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Step 1 — Photo or Sample Preset
            </Text>

            {imageUri ? (
              <View style={styles.previewWrapper}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                {Boolean(imageDimensions) && (
                  <View style={styles.compressionBadge}>
                    <Text style={styles.compressionBadgeText}>
                      Optimized ≤1024px: {imageDimensions}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyPreviewBox}>
                <Camera size={28} color={Palette.primaryMuted} />
                <Text style={styles.emptyPreviewTitle}>
                  Snap a leaf photo or choose a sample below
                </Text>
                <Text style={styles.emptyPreviewSub}>
                  Auto-resized & compressed to ≤1024×1024 via
                  expo-image-manipulator
                </Text>
              </View>
            )}

            <View style={styles.mediaButtonsRow}>
              <Pressable
                onPress={handleTakePhoto}
                style={({ pressed }) => [
                  styles.secondaryMediaBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Camera size={16} color={Palette.primary} />
                <Text style={styles.secondaryMediaBtnText}>Camera</Text>
              </Pressable>

              <Pressable
                onPress={handlePickFromLibrary}
                style={({ pressed }) => [
                  styles.secondaryMediaBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <ImageIcon size={16} color={Palette.primary} />
                <Text style={styles.secondaryMediaBtnText}>Photo Library</Text>
              </Pressable>
            </View>
          </View>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={Palette.criticalText} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* WORKFLOW 1: IDENTIFY & ADD PLANT */}
          {mode === "identify" ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Step 2 — Botanical Name or Visual Clues
              </Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="e.g., Crassula ovata, Jade Plant, Avocado seed, Monstera..."
                placeholderTextColor={Palette.textMuted}
                style={styles.textInput}
              />

              <Pressable
                onPress={handleRunIdentification}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.primaryActionBtn,
                  (pressed || isLoading) && { opacity: 0.85 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={Palette.textInverse} size="small" />
                ) : (
                  <Sparkles size={17} color={Palette.textInverse} />
                )}
                <Text style={styles.primaryActionBtnText}>
                  {isLoading
                    ? "Analyzing Specimen..."
                    : "Run AI Plant Identification"}
                </Text>
              </Pressable>

              {/* Identification Result & Add-to-Garden Form */}
              {idResult && (
                <View style={styles.resultContainer}>
                  <View style={styles.resultHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultCommonName}>
                        {idResult.commonName}
                      </Text>
                      <Text style={styles.resultScientific}>
                        {idResult.scientificName} • {idResult.family}
                      </Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(idResult.confidence * 100)}% Match
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.resultNotes}>
                    {idResult.identificationNotes}
                  </Text>

                  {/* Baseline Care Grid */}
                  <View style={styles.careSpecBox}>
                    <Text style={styles.careSpecLine}>
                      <Text style={styles.careSpecLabel}>Ideal Light: </Text>
                      {idResult.baselineCare.idealLight}
                    </Text>
                    <Text style={styles.careSpecLine}>
                      <Text style={styles.careSpecLabel}>Base Watering: </Text>
                      Every {idResult.baselineCare.baseWateringDays} days
                    </Text>
                    <Text style={styles.careSpecLine}>
                      <Text style={styles.careSpecLabel}>Substrate: </Text>
                      {idResult.baselineCare.soilRecommendation}
                    </Text>
                  </View>

                  {/* Succulent Guardrail Callout */}
                  {idResult.baselineCare.succulentGuardrails
                    .isSucculentOrCactus && (
                    <View style={styles.guardrailBox}>
                      <ShieldAlert size={16} color={Palette.attentionText} />
                      <Text style={styles.guardrailText}>
                        {
                          idResult.baselineCare.succulentGuardrails
                            .rotWarningNote
                        }
                      </Text>
                    </View>
                  )}

                  {/* Customize Specimen Details before Saving */}
                  <View style={styles.formDivider} />
                  <Text style={styles.sectionTitle}>
                    Step 3 — Save Specimen to My Garden
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Plant Nickname</Text>
                    <TextInput
                      value={nickname}
                      onChangeText={setNickname}
                      style={styles.textInput}
                      placeholder="e.g., Sunny Window Jade"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      Location in Home / Garden
                    </Text>
                    <TextInput
                      value={location}
                      onChangeText={setLocation}
                      style={styles.textInput}
                      placeholder="e.g., South Living Room Sill"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Pot / Vessel Material</Text>
                    <View style={styles.presetRow}>
                      {(
                        [
                          { key: "terracotta", label: "Terracotta" },
                          { key: "ceramic_glazed", label: "Glazed Ceramic" },
                          { key: "plastic_nursery", label: "Nursery Pot" },
                          { key: "glass_vessel", label: "Glass Jar" },
                        ] as const
                      ).map((pm) => (
                        <Pressable
                          key={pm.key}
                          onPress={() => setPotMaterial(pm.key)}
                          style={[
                            styles.presetChip,
                            potMaterial === pm.key && styles.presetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              potMaterial === pm.key &&
                                styles.presetChipTextActive,
                            ]}
                          >
                            {pm.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>
                        Container Has Bottom Drainage Hole
                      </Text>
                      <Text style={styles.switchSub}>
                        Critical for preventing anaerobic root rot in succulents
                      </Text>
                    </View>
                    <Switch
                      value={hasDrainageHole}
                      onValueChange={setHasDrainageHole}
                      trackColor={{
                        false: Palette.borderSubtle,
                        true: Palette.primary,
                      }}
                    />
                  </View>

                  <Pressable
                    onPress={handleSaveIdentifiedPlant}
                    style={({ pressed }) => [
                      styles.terracottaBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <CheckCircle2 size={17} color={Palette.textInverse} />
                    <Text style={styles.primaryActionBtnText}>
                      Add to My Garden & Open Notebook
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            /* WORKFLOW 2: AI HEALTH & CONDITION SCAN */
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Step 2 — Select Specimen & Describe Symptoms
              </Text>

              <View style={styles.presetRow}>
                {plants.map((plant) => {
                  const active = plant.id === selectedPlant?.id;
                  return (
                    <Pressable
                      key={plant.id}
                      onPress={() => setSelectedPlantId(plant.id)}
                      style={[
                        styles.presetChip,
                        active && styles.presetChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          active && styles.presetChipTextActive,
                        ]}
                      >
                        {plant.nickname} ({plant.species.commonName})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedPlant && (
                <View style={styles.contextSummaryBox}>
                  <Text style={styles.contextSummaryTitle}>
                    Historical Context Injected into AI Prompt:
                  </Text>
                  <Text style={styles.contextSummaryItem}>
                    • Species: {selectedPlant.species.commonName} (
                    {selectedPlant.species.scientificName},{" "}
                    {selectedPlant.species.family})
                  </Text>
                  <Text style={styles.contextSummaryItem}>
                    • Container: {selectedPlant.potMaterial.replace("_", " ")} •{" "}
                    {selectedPlant.hasDrainageHole
                      ? "Has drainage hole"
                      : "NO drainage hole"}
                  </Text>
                  <Text style={styles.contextSummaryItem}>
                    • Care Timeline: {selectedPlantLogs.length} logged events
                    (Last watered:{" "}
                    {new Date(selectedPlant.lastWateredAt).toLocaleDateString()}
                    )
                  </Text>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Visual Symptoms / Observations (Optional)
                </Text>
                <TextInput
                  value={observationNotes}
                  onChangeText={setObservationNotes}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    { minHeight: 72, textAlignVertical: "top" },
                  ]}
                  placeholder="Describe any yellowing, wrinkling, stretching, spots, or root growth..."
                  placeholderTextColor={Palette.textMuted}
                />
              </View>

              <Pressable
                onPress={handleRunHealthDiagnosis}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.primaryActionBtn,
                  (pressed || isLoading) && { opacity: 0.85 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color={Palette.textInverse} size="small" />
                ) : (
                  <Stethoscope size={17} color={Palette.textInverse} />
                )}
                <Text style={styles.primaryActionBtnText}>
                  {isLoading
                    ? "Cross-Referencing Photo & Care Logs..."
                    : "Run AI Health & Condition Scan"}
                </Text>
              </Pressable>

              {/* Diagnosis Output Card */}
              {diagnosisResult && selectedPlant && (
                <View style={styles.resultContainer}>
                  <View style={styles.resultHeaderRow}>
                    <Text style={styles.resultCommonName}>
                      AI Diagnosis Complete
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            HealthBadgeTheme[diagnosisResult.healthStatus].bg,
                          borderColor:
                            HealthBadgeTheme[diagnosisResult.healthStatus]
                              .border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              HealthBadgeTheme[diagnosisResult.healthStatus]
                                .text,
                          },
                        ]}
                      >
                        {HealthBadgeTheme[diagnosisResult.healthStatus].label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.resultNotes}>
                    {diagnosisResult.diagnosisSummary}
                  </Text>

                  {diagnosisResult.succulentGuardrailApplied && (
                    <View style={styles.guardrailBox}>
                      <ShieldAlert size={16} color={Palette.attentionText} />
                      <Text style={styles.guardrailText}>
                        {diagnosisResult.succulentGuardrailApplied}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.subHeader}>Recommended Next Steps:</Text>
                  {diagnosisResult.recommendedActions.map((act, idx) => {
                    const urg = UrgencyBadgeTheme[act.urgency];
                    return (
                      <View key={idx} style={styles.actionRowItem}>
                        <View
                          style={[
                            styles.urgencyPill,
                            {
                              backgroundColor: urg.bg,
                              borderColor: urg.border,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.urgencyText, { color: urg.text }]}
                          >
                            {urg.label}
                          </Text>
                        </View>
                        <Text style={styles.actionRowText}>
                          {act.instruction}
                        </Text>
                      </View>
                    );
                  })}

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/plant/[id]",
                        params: { id: selectedPlant.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.terracottaBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <CheckCircle2 size={16} color={Palette.textInverse} />
                    <Text style={styles.primaryActionBtnText}>
                      View in {selectedPlant.nickname} Notebook
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.bgPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 1.5,
    alignItems: "center",
  },
  maxContainer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.md,
  },
  headerBlock: {
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  engineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  engineBadgeLive: {
    backgroundColor: Palette.thrivingBg,
    borderColor: Palette.thrivingBorder,
  },
  engineBadgeMock: {
    backgroundColor: Palette.bgSubtle,
    borderColor: Palette.borderSubtle,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineDotLive: {
    backgroundColor: Palette.thrivingText,
  },
  engineDotMock: {
    backgroundColor: Palette.textMuted,
  },
  engineBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  engineBadgeTextLive: {
    color: Palette.thrivingText,
  },
  engineBadgeTextMock: {
    color: Palette.textSecondary,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: Palette.primary,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  segmentedBar: {
    flexDirection: "row",
    backgroundColor: Palette.bgSubtle,
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: Palette.primary,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.textSecondary,
  },
  segmentBtnTextActive: {
    color: Palette.textInverse,
  },
  card: {
    backgroundColor: Palette.bgSurface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...CardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  previewWrapper: {
    position: "relative",
    borderRadius: Radius.md,
    overflow: "hidden",
    height: 190,
    backgroundColor: Palette.bgSubtle,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  compressionBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(28, 40, 32, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  compressionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Palette.textInverse,
  },
  emptyPreviewBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Palette.borderSubtle,
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyPreviewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.textPrimary,
  },
  emptyPreviewSub: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: "center",
  },
  mediaButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  secondaryMediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Palette.primarySoft,
    borderWidth: 1,
    borderColor: "#C5DEC9",
  },
  secondaryMediaBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.primary,
  },
  presetBlock: {
    gap: 6,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Palette.textSecondary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  presetChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Palette.textPrimary,
  },
  presetChipTextActive: {
    color: Palette.textInverse,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Palette.criticalBg,
    borderColor: Palette.criticalBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: Radius.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Palette.criticalText,
  },
  textInput: {
    backgroundColor: Palette.bgPrimary,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Palette.textPrimary,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Palette.primary,
    paddingVertical: 13,
    borderRadius: Radius.md,
  },
  terracottaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Palette.accentTerracotta,
    paddingVertical: 13,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.textInverse,
  },
  resultContainer: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.borderSubtle,
    gap: 12,
  },
  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  resultCommonName: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  resultScientific: {
    fontSize: 13,
    fontStyle: "italic",
    color: Palette.textSecondary,
  },
  confidenceBadge: {
    backgroundColor: Palette.thrivingBg,
    borderColor: Palette.thrivingBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.thrivingText,
  },
  resultNotes: {
    fontSize: 14,
    lineHeight: 20,
    color: Palette.textSecondary,
  },
  careSpecBox: {
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  careSpecLine: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textPrimary,
  },
  careSpecLabel: {
    fontWeight: "700",
    color: Palette.primary,
  },
  guardrailBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Palette.attentionBg,
    borderColor: Palette.attentionBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: Radius.md,
  },
  guardrailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: Palette.attentionText,
  },
  formDivider: {
    height: 1,
    backgroundColor: Palette.borderSubtle,
    marginVertical: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  switchSub: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  contextSummaryBox: {
    backgroundColor: Palette.bgPrimary,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
    gap: 4,
  },
  contextSummaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.primary,
    marginBottom: 2,
  },
  contextSummaryItem: {
    fontSize: 12,
    color: Palette.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: Palette.textPrimary,
  },
  actionRowItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Palette.bgPrimary,
    padding: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.borderSubtle,
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  actionRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.textPrimary,
  },
});
