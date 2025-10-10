import React, { useState } from "react";
import CropModal from "../components/CropModal";
const ADMIN_CODE = "LU-ADMIN-2025";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTheme } from "@mui/material/styles";
import { validateImageFile, getOptimalImageSize } from "../utils/imageValidation";
import { resizeImage } from "../utils/resizeImage";
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from "../utils/phoneValidation";

export default function Signup({ onSignupComplete }) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const theme = useTheme();
  const [form, setForm] = useState({
    role: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    major: "",
    graduationYear: "",
    company: "",
    title: "",
    linkedinUrl: "",
    registrationCode: "",
    phoneNumber: ""
  });
  const [headshotFile, setHeadshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [verifiedCodeData, setVerifiedCodeData] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  // Crop modal state (replaces react-easy-crop logic)
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // LinkedIn URL normalization
  const handleLinkedinChange = (e) => {
    let url = e.target.value.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    setForm(prev => ({ ...prev, linkedinUrl: url }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleHeadshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setCropImageSrc(reader.result);
        setShowCropModal(true);
      }
    };
    reader.onerror = () => {
      alert("Failed to read the image file. Please try again.");
      e.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 1. Ensure headshot is uploaded before allowing submission
    if (!headshotFile) {
      alert("Please upload a headshot before submitting.");
      return;
    }
    try {
      // Registration code logic left for audit and logging, but validation is now done in step 2.
      const codeData = verifiedCodeData;

      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      let headshotUrl = "";
      // 2. Robust error handling for upload
      try {
        const storage = getStorage();
        const ref = storageRef(storage, `users/${userCred.user.uid}/profile.jpg`);
        await uploadBytes(ref, headshotFile);
        headshotUrl = await getDownloadURL(ref);
      } catch (uploadError) {
        console.error("Headshot upload failed:", uploadError);
      }

      if (!headshotUrl) {
        console.warn("No headshot URL was saved — check upload or permissions.");
      }

      const profileData = {
        uid: userCred.user.uid,
        email: form.email,
        displayName: `${form.firstName} ${form.lastName}`,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        registrationCodeVerified: true,
        isAdmin: codeData.isAdmin === true,
        headshotUrl,
        linkedinUrl: form.linkedinUrl,
        phoneNumber: form.phoneNumber ? normalizePhoneNumber(form.phoneNumber) : "",
        registrationCodeUsed: form.registrationCode.trim(),
      };
      if (form.role === "student") {
        profileData.major = form.major;
        profileData.graduationYear = form.graduationYear;
      } else if (["coach", "board", "employee"].includes(form.role)) {
        profileData.company = form.company;
        profileData.title = form.title;
      }
      await setDoc(doc(db, "users", userCred.user.uid), profileData);
      // Confirm the Firestore document has been written before proceeding
      const writtenProfileDoc = await getDoc(doc(db, "users", userCred.user.uid));
      if (!writtenProfileDoc.exists()) {
        throw new Error("Profile write confirmation failed.");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 2 registration code validation
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const codeRef = doc(db, "registrationCodes", form.registrationCode.trim());
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists() || codeSnap.data().active !== true) {
      alert("Invalid or inactive registration code.");
      return;
    }

    setVerifiedCodeData(codeSnap.data());

    handleNext();
  };

  return (
    <div style={{
      maxWidth: "400px",
      margin: "2rem auto",
      padding: "2rem 1rem",
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      borderRadius: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      border: `1px solid ${theme.palette.divider}`,
      boxSizing: "border-box",
      width: "100%",
      maxHeight: "100vh",
      overflowY: "auto",
      scrollPaddingBottom: "5rem"
    }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <img src="/logo.png" alt="Level Up Logo" style={{ height: "48px", marginBottom: "0.5rem" }} />
      </div>
      <h2 style={{ marginBottom: "1rem", textAlign: "center" }}>Sign Up</h2>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p>Select your role:</p>
          {/* Student and Coach */}
          <button
            onClick={() => { setForm(prev => ({ ...prev, role: "student" })); handleNext(); }}
            style={{
              backgroundColor: "var(--brand-primary-coral)", // coral
              color: "#fff",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "none",
              width: "100%",
              fontWeight: 600,
              minHeight: "44px"
            }}
          >
            Student
          </button>
          <button
            onClick={() => { setForm(prev => ({ ...prev, role: "coach" })); handleNext(); }}
            style={{
              backgroundColor: "var(--brand-primary-blue)", // dark blue
              color: "#fff",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "none",
              width: "100%",
              fontWeight: 600,
              minHeight: "44px"
            }}
          >
            Coach
          </button>
          {/* Divider */}
          <hr style={{ border: `1px solid ${theme.palette.divider}`, margin: "1.5rem 0" }} />
          {/* Board and Level Up Employee */}
          <button
            onClick={() => { setForm(prev => ({ ...prev, role: "board" })); handleNext(); }}
            style={{
              backgroundColor: "#F6F6F6", // Apple-style neutral grey
              color: theme.palette.text.primary,
              padding: "0.75rem",
              borderRadius: "6px",
              border: "none",
              width: "100%",
              fontWeight: 600,
              minHeight: "44px"
            }}
          >
            Board
          </button>
          <button
            onClick={() => { setForm(prev => ({ ...prev, role: "admin" })); handleNext(); }}
            style={{
              backgroundColor: "#E5E5E5", // Apple-style lighter grey
              color: theme.palette.text.primary,
              padding: "0.75rem",
              borderRadius: "6px",
              border: "none",
              width: "100%",
              fontWeight: 600,
              minHeight: "44px"
            }}
          >
            Level Up Employee
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2Submit}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <input
            name="firstName"
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <input
            name="lastName"
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <input
            name="registrationCode"
            placeholder="Registration Code"
            value={form.registrationCode}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <p style={{ fontSize: "0.85rem", marginTop: "-0.5rem", color: theme.palette.text.secondary }}>
            Don’t have a code?{" "}
            <a
              href={`mailto:hello@levelupcincinnati.org?subject=Registration Code Request from ${form.email}&body=You have a new registration code request from ${form.firstName} ${form.lastName} at ${form.email}.%0D%0AIf this is an approved user, please send them a registration code as soon as possible.`}
              style={{ color: "var(--brand-primary-coral)", textDecoration: "underline" }}
            >
              Request one now
            </a>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "var(--brand-primary-blue)",
                color: "#fff",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "none",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                color: theme.palette.text.primary,
                cursor: "pointer",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Back
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {form.role === "student" ? (
            <>
              <input
                name="major"
                placeholder="Current Major"
                value={form.major}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  boxSizing: "border-box",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <select
                name="graduationYear"
                value={form.graduationYear}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: form.graduationYear ? theme.palette.text.primary : theme.palette.text.disabled,
                  boxSizing: "border-box",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              >
                <option value="" disabled hidden>Graduation Year</option>
                {[...Array(9)].map((_, i) => {
                  const year = new Date().getFullYear() + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </>
          ) : (
            <>
              <input
                name="company"
                placeholder="Current Company"
                value={form.company}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  boxSizing: "border-box",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <input
                name="title"
                placeholder="Current Title"
                value={form.title}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  boxSizing: "border-box",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
            </>
          )}
          <input
            name="linkedinUrl"
            type="url"
            placeholder="LinkedIn Profile URL"
            value={form.linkedinUrl}
            onChange={handleLinkedinChange}
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          <div>
            <input
              name="phoneNumber"
              type="tel"
              placeholder="Phone Number (optional)"
              value={formatPhoneNumber(form.phoneNumber)}
              onChange={(e) => {
                const rawValue = e.target.value;
                const cleaned = rawValue.replace(/\D/g, '');

                // Limit to 11 digits max (1 + 10 digit phone number)
                if (cleaned.length <= 11) {
                  handleChange({ target: { name: 'phoneNumber', value: cleaned } });

                  const validation = validatePhoneNumber(cleaned);
                  if (!validation.isValid && cleaned.length > 0) {
                    setPhoneError(validation.error || "Invalid phone number");
                  } else {
                    setPhoneError("");
                  }
                }
              }}
              style={{
                width: "100%",
                maxWidth: "100%",
                padding: "0.75rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${phoneError ? '#ef4444' : theme.palette.divider}`,
                color: theme.palette.text.primary,
                boxSizing: "border-box",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            />
            {phoneError && (
              <p style={{
                color: "#ef4444",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
                marginBottom: 0
              }}>
                {phoneError}
              </p>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
            <button
              type="submit"
              style={{
                backgroundColor: "var(--brand-primary-blue)",
                color: "#fff",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "none",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Next
            </button>
            <button
              type="button"
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                color: theme.palette.text.primary,
                cursor: "pointer",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Back
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
          <p style={{ fontSize: "0.9rem", color: "var(--brand-deep-gray)", textAlign: "center" }}>
            Upload your headshot (square image preferred)
          </p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Headshot preview"
              style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleHeadshotChange}
            required
            style={{
              width: "100%",
              maxWidth: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              boxSizing: "border-box",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          {showCropModal && cropImageSrc && (
            <CropModal
              imageSrc={cropImageSrc}
              onCancel={() => {
                setShowCropModal(false);
                setCropImageSrc(null);
              }}
              onCropComplete={async (croppedFile) => {
                try {
                  setShowCropModal(false);
                  
                  // Resize the image for optimal performance
                  const optimal = getOptimalImageSize();
                  const resizedBlob = await resizeImage(croppedFile, optimal.maxWidth, optimal.quality);
                  const finalFile = new File([resizedBlob], "profile.jpg", { type: "image/jpeg" });
                  
                  setHeadshotFile(finalFile);
                  setPreviewUrl(URL.createObjectURL(finalFile));
                  setCropImageSrc(null);
                } catch (error) {
                  console.error("Error processing cropped image:", error);
                  alert("Failed to process the image. Please try again.");
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
            <button
              onClick={handleNext}
              style={{
                backgroundColor: "var(--brand-primary-blue)",
                color: "#fff",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "none",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Next
            </button>
            <button
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                color: theme.palette.text.primary,
                cursor: "pointer",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "center" }}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Headshot preview"
              style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", margin: "0 auto" }}
            />
          )}
          <p><strong>Name:</strong> {form.firstName} {form.lastName}</p>
          <p><strong>Email:</strong> {form.email}</p>
          {form.role === "student" ? (
            <p><strong>Major:</strong> {form.major}</p>
          ) : (
            <p><strong>Company:</strong> {form.company}</p>
          )}
          <p><strong>Role:</strong> {form.role.charAt(0).toUpperCase() + form.role.slice(1)}</p>
          {form.linkedinUrl && (
            <p><strong>LinkedIn:</strong> <a href={form.linkedinUrl} target="_blank" rel="noopener noreferrer">{form.linkedinUrl}</a></p>
          )}
          {form.phoneNumber && (
            <p><strong>Phone:</strong> {formatPhoneNumber(form.phoneNumber)}</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem", width: "100%" }}>
            <button
              onClick={handleBack}
              style={{
                background: "none",
                border: "none",
                color: theme.palette.text.primary,
                cursor: "pointer",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              style={{
                backgroundColor: "var(--brand-primary-coral)",
                color: "#fff",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                width: "100%",
                minHeight: "44px"
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
      <p style={{
        textAlign: "center",
        fontSize: "0.875rem",
        marginTop: "1.5rem"
      }}>
        <button
          className="button-link"
          onClick={() => navigate("/login")}
          style={{
            color: "var(--brand-primary-coral)",
            background: "none",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            minHeight: "44px"
          }}
        >
          Return to login
        </button>
      </p>
    </div>
  );
}