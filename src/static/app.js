document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggle = document.getElementById("login-toggle");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLogin = document.getElementById("cancel-login");
  const logoutButton = document.getElementById("logout-button");
  const teacherStatus = document.getElementById("teacher-status");

  let teacherLoggedIn = false;

  function setMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateTeacherUI() {
    const formControls = signupForm.querySelectorAll("input, select, button[type='submit']");
    formControls.forEach((control) => {
      if (control.tagName === "BUTTON") {
        control.disabled = !teacherLoggedIn;
      } else {
        control.disabled = !teacherLoggedIn;
      }
    });

    loginToggle.classList.toggle("hidden", teacherLoggedIn);
    logoutButton.classList.toggle("hidden", !teacherLoggedIn);

    if (teacherLoggedIn) {
      teacherStatus.textContent = "Logged in as teacher. You can register and unregister students.";
      teacherStatus.classList.add("teacher-active");
    } else {
      teacherStatus.textContent = "Teacher login required to register or unregister students.";
      teacherStatus.classList.remove("teacher-active");
    }
  }

  async function fetchAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const auth = await response.json();
      teacherLoggedIn = Boolean(auth.logged_in);
      updateTeacherUI();
    } catch (error) {
      console.error("Error fetching auth status:", error);
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const deleteButton = teacherLoggedIn
                      ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                      : "";
                    return `<li><span class="participant-email">${email}</span>${deleteButton}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
          : "<p><em>No participants yet</em></p>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">${participantsHTML}</div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacherLoggedIn) {
      setMessage("Teacher login required to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        setMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      setMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginToggle.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  cancelLogin.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/logout", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        teacherLoggedIn = false;
        updateTeacherUI();
        fetchActivities();
        setMessage(result.message, "info");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        teacherLoggedIn = true;
        loginModal.classList.add("hidden");
        loginForm.reset();
        updateTeacherUI();
        fetchActivities();
        setMessage(result.message, "success");
      } else {
        setMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      setMessage("Unable to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  fetchAuthStatus();
  fetchActivities();
});
