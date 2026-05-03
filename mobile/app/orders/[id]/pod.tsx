import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SignatureScreen, { type SignatureViewRef } from "react-native-signature-canvas";
import { ApiError, api } from "../../../lib/api";
import { colors, radii, spacing, typography } from "../../../lib/theme";

type Step = "photo" | "signature" | "details";

export default function PodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("photo");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const sigRef = useRef<SignatureViewRef>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!photoUri || !signatureBase64) throw new Error("Missing POD data");
      const form = new FormData();
      form.append("photo", {
        uri: photoUri,
        name: "pod-photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      form.append("signature", signatureBase64);
      form.append("recipientName", recipientName.trim());
      if (notes.trim()) form.append("notes", notes.trim());
      return api.uploadPod(id!, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      router.replace("/");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Upload failed.";
      Alert.alert("Could not submit POD", msg);
    },
  });

  if (step === "photo") {
    if (!permission) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={typography.h2}>Camera access needed</Text>
            <Text style={[typography.muted, { marginTop: spacing.sm, textAlign: "center" }]}>
              We need the camera to capture proof of delivery.
            </Text>
            <Pressable onPress={requestPermission} style={[styles.primary, { marginTop: spacing.lg }]}>
              <Text style={styles.primaryText}>Grant access</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Photo" }} />
        {photoUri ? (
          <View style={{ flex: 1 }}>
            <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
            <View style={styles.bottomBar}>
              <Pressable onPress={() => setPhotoUri(null)} style={styles.secondary}>
                <Text style={styles.secondaryText}>Retake</Text>
              </Pressable>
              <Pressable onPress={() => setStep("signature")} style={styles.primary}>
                <Text style={styles.primaryText}>Use photo</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
            <View style={styles.bottomBar}>
              <Pressable
                onPress={async () => {
                  const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
                  if (photo?.uri) setPhotoUri(photo.uri);
                }}
                style={styles.shutter}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (step === "signature") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Signature" }} />
        <View style={{ flex: 1 }}>
          <SignatureScreen
            ref={sigRef}
            onOK={(sig) => {
              setSignatureBase64(sig);
              setStep("details");
            }}
            descriptionText="Recipient signs above"
            confirmText="Save"
            clearText="Clear"
            webStyle={SIGNATURE_STYLE}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Details" }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={typography.label}>Recipient name</Text>
        <TextInput
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Who received the parcel?"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={[typography.label, { marginTop: spacing.md }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth noting"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
        />
        <Pressable
          disabled={submit.isPending || !recipientName.trim()}
          onPress={() => submit.mutate()}
          style={({ pressed }) => [
            styles.primary,
            { marginTop: spacing.lg },
            (pressed || submit.isPending || !recipientName.trim()) && { opacity: 0.6 },
          ]}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Submit & mark delivered</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const SIGNATURE_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #e2e8f0; }
  .m-signature-pad--footer { display: flex; justify-content: space-between; }
  body, html { background-color: #f8fafc; }
`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  bottomBar: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    flex: 1,
  },
  primaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondary: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  secondaryText: { color: colors.text, fontWeight: "600", fontSize: 16 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: colors.primary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
});
