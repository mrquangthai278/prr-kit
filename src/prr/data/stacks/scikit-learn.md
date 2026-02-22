# scikit-learn — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `from sklearn`, `import sklearn`, `sklearn.`, `fit(`, `predict(`, `Pipeline(`, `GridSearchCV`

---

## Security
- **[HIGH]** `joblib.load()` or `pickle.load()` used to load models from untrusted or user-supplied file paths → arbitrary Python code executed on deserialization. Only load model files from trusted, integrity-verified sources; consider ONNX export for untrusted distribution.
- **[HIGH]** Production model trained on data containing user PII without anonymization or differential privacy → model can memorize and leak training data. Apply anonymization, aggregation, or differential privacy techniques before training on personal data.
- **[MEDIUM]** Feature names or column names exposed in model metadata, error messages, or API responses → internal data structure leakage that aids inference attacks. Sanitize error messages and abstract feature names in API-facing layers.
- **[MEDIUM]** Model prediction endpoint not authenticated or rate limited → API open to abuse, model extraction attacks, or denial-of-service via expensive inference. Apply authentication and rate limiting to all prediction endpoints.
- **[LOW]** Model artifacts stored in version control with Git LFS not configured → large binary files bloat repository history. Store model artifacts in object storage (S3, GCS) and reference them by hash in version control.

---

## Performance
- **[HIGH]** Estimators that support parallel execution (RandomForest, GridSearchCV, cross_val_score) called without `n_jobs=-1` → only one CPU core used for embarrassingly parallel work. Set `n_jobs=-1` to use all available cores.
- **[HIGH]** `GridSearchCV` used with an exhaustive parameter grid over many combinations → combinatorial explosion in search time. Use `RandomizedSearchCV` with `n_iter` budget, or Bayesian optimisation with `optuna`.
- **[HIGH]** `StandardScaler` or `OneHotEncoder` fitted on the full dataset before train/test split → data leakage: test set statistics influence the scaler, producing optimistically biased evaluation metrics. Split data first; fit transformers only on the training set.
- **[MEDIUM]** Preprocessing steps applied manually outside a `Pipeline` → transforms applied inconsistently between training and inference. Wrap all preprocessing + estimator steps in `Pipeline` to ensure identical transforms at inference.
- **[MEDIUM]** Entire dataset loaded into memory as a dense NumPy array → out-of-memory for large datasets. Use sparse matrices for high-cardinality categorical data; use `partial_fit` estimators for incremental learning.
- **[LOW]** Expensive feature transformations recomputed on every cross-validation fold → slow CV. Use `joblib.Memory` caching with `Pipeline`'s `memory` parameter to cache intermediate transform outputs.

---

## Architecture
- **[CRITICAL]** Preprocessing fitted on the full dataset (train + test) before the train/test split → data leakage causes inflated and unreliable evaluation metrics. Always split data before any fitting, without exception.
- **[HIGH]** Model evaluated on training data only → accuracy appears near-perfect, masking severe overfitting. Always evaluate on a held-out test set and use cross-validation for hyperparameter selection.
- **[HIGH]** Preprocessing steps applied outside a `Pipeline` during cross-validation → test fold data leaks into scaler fit during CV, producing misleadingly optimistic CV scores. Encapsulate all steps in `Pipeline` before passing to `cross_val_score` or `GridSearchCV`.
- **[MEDIUM]** Model not persisted with `joblib.dump()` or `pickle` after training → model retrained from scratch on every application restart. Serialize the fitted pipeline and load it at serving time.
- **[MEDIUM]** Single train/test split used instead of cross-validation for model selection → evaluation highly sensitive to the random split. Use k-fold cross-validation for more reliable model selection.
- **[LOW]** Hyperparameters hardcoded in the script → reproducibility and experimentation require editing source files. Define hyperparameters in a config file (YAML, JSON) or pass them via CLI arguments.

---

## Code Quality
- **[HIGH]** Model metrics computed only on the training set → misleading evaluation reported as model performance. Always report metrics on the test set; include precision, recall, and F1 alongside accuracy.
- **[HIGH]** Class imbalance not addressed for classification tasks → model biased toward the majority class with high accuracy but poor minority-class recall. Apply `class_weight='balanced'`, oversampling (SMOTE), or undersampling as appropriate.
- **[MEDIUM]** Feature importance or coefficients not inspected after training → model behaviour opaque and potential data leakage features go undetected. Log `feature_importances_` or `coef_` and review top features before deployment.
- **[MEDIUM]** `set_output(transform='pandas')` not used when downstream code expects DataFrames → transform output is a NumPy array, losing column names. Call `set_output(transform='pandas')` on the pipeline for DataFrame-compatible output.
- **[MEDIUM]** Evaluation metric not aligned with the business objective → optimising accuracy for a cost-sensitive problem ignores the cost of false negatives vs false positives. Choose metrics (ROC-AUC, average precision, custom cost function) that reflect real-world consequences.
- **[LOW]** `random_state` not set on estimators and splitters → results not reproducible across runs. Set `random_state` to a fixed integer on all stochastic components.

---

## Common Bugs & Pitfalls
- **[CRITICAL]** Scaler, encoder, or imputer fitted on the combined dataset before splitting → optimistic test metrics that overestimate production performance. This is the single most common ML mistake; always fit on train only and transform test separately.
- **[HIGH]** `predict_proba()` output used as calibrated probabilities without calibration → raw scikit-learn probabilities are often poorly calibrated for SVMs and boosted trees. Apply `CalibratedClassifierCV` when probabilities are used for decision-making.
- **[MEDIUM]** Categorical features passed to tree-based models as raw strings → most sklearn estimators do not accept string features. Apply `OrdinalEncoder` or `OneHotEncoder` before fitting; use `ColumnTransformer` inside a `Pipeline`.
- **[MEDIUM]** `SimpleImputer` fitted on the full dataset before the train/test split → imputation statistics computed from the test set leak into the model. Include the imputer as the first step in a `Pipeline` fitted only on training data.
- **[MEDIUM]** `LabelEncoder` used to encode feature columns → `LabelEncoder` is designed for target labels and raises an error on unseen categories at inference. Use `OrdinalEncoder` for ordinal features and `OneHotEncoder` for nominal features.
- **[LOW]** `cross_val_score` used with a regression metric string for a classifier or vice versa → wrong scoring produces meaningless numbers without an error. Pass the correct `scoring` parameter explicitly and verify it matches the estimator type.
