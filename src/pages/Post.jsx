import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./Post.css";

//function component to display the post form
function Post() {
    const { user, isAuthenticated, isPaidPlan } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Stores the selected post type.
    const [postType, setPostType] = useState("question");

    // Stores question form data.
    const [question, setQuestion] = useState({
        title: "",
        description: "",
        tags: ""
    });

    // Stores article form data.
    const [article, setArticle] = useState({
        title: "",
        abstract: "",
        content: "",
        tags: ""
    });

    // Stores popup information.
    const [modal, setModal] = useState({
        isOpen: false,
        type: "success",
        title: "",
        messages: []
    });

    // Check which post type is selected.
    const isQuestion = postType === "question";
    

    // Get data from the selected form.
    //if postType is question then get question data else get article data
    const data = isQuestion ? question : article;

    // Update form fields when the user types.
    function handleChange(e) {
        const { name, value } = e.target;

        if (isQuestion) {
            // Keep other question fields unchanged.
            //spread operator(...) is used to copy the existing properties of the state object
            setQuestion({ ...question, [name]: value });
        } else {
            // Keep other article fields unchanged.
            //spread operator (...) is used to copy the existing properties of the state object
            setArticle({ ...article, [name]: value });
        }
    }

    async function handleSubmit(e) {
        // Stop the page from refreshing.
        e.preventDefault();

        // Store validation errors.
        const errors = [];

        // Split tags by commas and remove extra spaces.
        const tags = data.tags
            .split(",")
            .map(tag => tag.trim())
            .filter(tag => tag);

        // Check the title.
        if (!data.title.trim()) {
            errors.push("Title is required.");
        } else if (data.title.trim().length < 5) {
            errors.push("Title must be at least 5 characters long.");
        }

        // Check the question description.
        if (isQuestion && !question.description.trim()) {
            errors.push("Please describe your problem.");
        }

        // Check the article abstract.
        if (!isQuestion && !article.abstract.trim()) {
            errors.push("Please enter an abstract.");
        }

        // Check the article content.
        if (!isQuestion && !article.content.trim()) {
            errors.push("Please enter the article content.");
        }

        // Require at least one tag and allow up to three.
        if (tags.length === 0) {
            errors.push("Please add at least one tag.");
        } else if (tags.length > 3) {
            errors.push("You can add a maximum of 3 tags.");
        }

        // Show errors if the form is invalid.
        if (errors.length > 0) {
            setModal({
                isOpen: true,
                type: "error",
                title: "Post Submission Failed",
                messages: errors
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare post data for Firestore
            const postDocument = {
                postType: postType, // "question" or "article"
                title: data.title.trim(),
                tags: tags,
                createdAt: serverTimestamp(),
                createdAtIso: new Date().toISOString(),
                author: {
                    id: user?.id || user?.uid || "anonymous",
                    name: user?.name || user?.displayName || user?.email || "Anonymous",
                    email: user?.email || null,
                    plan: isPaidPlan ? "paid" : "free"
                }
            };

            if (isQuestion) {
                postDocument.description = question.description.trim();
            } else {
                postDocument.abstract = article.abstract.trim();
                postDocument.content = article.content.trim();
            }

            // Save document into Firestore 'posts' collection
            await addDoc(collection(db, "posts"), postDocument);

            // Show a success message
            setModal({
                isOpen: true,
                type: "success",
                title: "Post Saved to Firestore!",
                messages: [
                    `Your ${postType} "${data.title.trim()}" has been successfully saved to Firestore and published.`
                ]
            });

            // Clear the submitted form
            if (isQuestion) {
                setQuestion({ title: "", description: "", tags: "" });
            } else {
                setArticle({ title: "", abstract: "", content: "", tags: "" });
            }
        } catch (error) {
            console.error("Error storing post in Firestore:", error);
            setModal({
                isOpen: true,
                type: "error",
                title: "Firestore Save Error",
                messages: [
                    "Failed to save your post to Firestore. Please check your connection and try again.",
                    error.message || ""
                ].filter(Boolean)
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    // Display the form.
    return (
        <div className="post-page-wrapper">
            <div className="post-container">
                {isAuthenticated && (
                    <div className={`post-plan-banner ${isPaidPlan ? "post-plan-paid" : "post-plan-free"}`}>
                        {isPaidPlan ? (
                            <span> <strong>PRO Member Active:</strong> You have unlimited monthly posting, 100 MB upload quota, and priority answer ranking enabled.</span>
                        ) : (
                            <span> <strong>Free Community Plan:</strong> 5 monthly posts limit. <Link to="/pricing" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}>Upgrade to Pro</Link> for unlimited posts & 100 MB uploads.</span>
                        )}
                    </div>
                )}
                <div className="post-header-bar">New Post</div>

                {/* Let the user select a question or article. */}
                <div className="post-type-selector">
                    <span className="selector-label">Select Post Type:</span>

                    <label className="radio-option">
                        <input
                            type="radio"
                            checked={isQuestion}
                            onChange={() => setPostType("question")}
                        />
                        <span>Question</span>
                    </label>

                    <label className="radio-option">
                        <input
                            type="radio"
                            checked={!isQuestion}
                            onChange={() => setPostType("article")}
                        />
                        <span>Article</span>
                    </label>
                </div>

                <div className="post-header-bar">
                    What do you want to ask or share
                </div>

                <p className="post-hint-text">
                    {isQuestion
                        ? "For a question, fill in the details below."
                        : "For an article, fill in the details below."}
                </p>

                <form onSubmit={handleSubmit} className="post-form">
                    <div className="conditional-fields">
                        <div className="form-row">
                            <label htmlFor="title" className="field-label">
                                Title
                            </label>

                            <input
                                id="title"
                                name="title"
                                className="text-input"
                                placeholder="Enter a title"
                                value={data.title}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Show fields according to the selected post type. */}
                        {isQuestion ? (
                            <div className="form-column">
                                <label htmlFor="description" className="field-label">
                                    Describe your problem
                                </label>

                                <textarea
                                    id="description"
                                    name="description"
                                    rows="10"
                                    className="textarea-input"
                                    placeholder="Explain your problem and what you have tried..."
                                    value={question.description}
                                    onChange={handleChange}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="form-column">
                                    <label htmlFor="abstract" className="field-label">
                                        Abstract
                                    </label>

                                    <textarea
                                        id="abstract"
                                        name="abstract"
                                        rows="3"
                                        className="textarea-input"
                                        placeholder="Enter an abstract"
                                        value={article.abstract}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-column">
                                    <label htmlFor="content" className="field-label">
                                        Article Text
                                    </label>

                                    <textarea
                                        id="content"
                                        name="content"
                                        rows="10"
                                        className="textarea-input"
                                        placeholder="Enter your article"
                                        value={article.content}
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        )}

                        <div className="form-row">
                            <label htmlFor="tags" className="field-label">
                                Tags
                            </label>

                            <input
                                id="tags"
                                name="tags"
                                className="text-input"
                                placeholder="Add up to 3 tags, separated by commas"
                                value={data.tags}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="post-actions">
                        <button type="submit" className="post-btn" disabled={isSubmitting}>
                            {isSubmitting ? "Saving to Firestore..." : "Post"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Show the popup only when it is open. */}
            {modal.isOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setModal({ ...modal, isOpen: false })
                    }
                >
                    <div
                        className={`modal-dialog ${
                            modal.type === "error"
                                ? "modal-error"
                                : "modal-success"
                        }`}
                        // Prevent clicks inside the popup from closing it.
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <span className="modal-icon">
                                {modal.type === "error" ? "!" : "✓"}
                            </span>

                            <h3>{modal.title}</h3>
                        </div>

                        <div className="modal-body">
                            {/* Display all errors or the success message. */}
                            {modal.messages.map((message, index) => (
                                <p key={index}>{message}</p>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="modal-btn"
                                onClick={() =>
                                    setModal({ ...modal, isOpen: false })
                                }
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Post;
