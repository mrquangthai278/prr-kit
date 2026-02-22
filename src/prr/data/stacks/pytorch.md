# PyTorch — Stack-Specific Review Rules

> Applies to: GR · SR · PR · AR · BR
> Detection signals: `import torch`, `from torch`, `torch.nn`, `torch.Tensor`, `DataLoader`, `nn.Module`, `optimizer.step()`, `loss.backward()`

---

## Security
- **[HIGH]** `torch.load()` called on a file from an untrusted or user-supplied source → arbitrary Python code executed via pickle deserialization. Only load weights from trusted sources; use `weights_only=True` (PyTorch 2.0+).
- **[HIGH]** `torch.load()` called without `weights_only=True` even for internal files → any future exposure of model files creates a deserialization attack vector. Always pass `weights_only=True` when loading state dicts.
- **[MEDIUM]** Training dataset not validated for adversarial or poisoned examples → model learns malicious behaviour embedded in data. Apply data validation, deduplication, and provenance tracking before training.
- **[MEDIUM]** Model serving endpoint returns raw embedding vectors in API response → model inversion attacks can reconstruct training data. Return only final predictions; never expose intermediate embeddings.
- **[LOW]** Jupyter notebooks used for data loading contain hardcoded API keys or credentials → keys committed to version control. Use environment variables or a secrets manager; add notebooks to `.gitignore` or strip outputs with `nbstripout`.

---

## Performance
- **[CRITICAL]** Training running on CPU when CUDA is available → 10-100x slower than GPU training. Check `torch.cuda.is_available()` and move model and tensors to the appropriate device.
- **[HIGH]** `DataLoader` created with `num_workers=0` → data loading is single-threaded and becomes the training bottleneck. Set `num_workers` to the number of available CPU cores (typically 4–8).
- **[HIGH]** `pin_memory=False` on DataLoader for GPU training → host-to-device memory transfers are slower. Set `pin_memory=True` when training on GPU for faster async data transfer.
- **[HIGH]** Large effective batch size not achievable due to VRAM limits and gradient accumulation not used → training diverges or uses a suboptimal batch size. Accumulate gradients over N steps and call `optimizer.step()` every N iterations.
- **[HIGH]** `torch.compile()` not used for production inference (PyTorch 2.0+) → model runs in eager mode, missing graph-level optimisations. Wrap the model with `torch.compile(model)` for deployment.
- **[MEDIUM]** Mixed-precision training not enabled → full FP32 used for all operations, doubling VRAM usage and halving throughput on modern GPUs. Use `torch.cuda.amp.autocast()` and `GradScaler` for FP16 training.
- **[MEDIUM]** Model not switched to `eval()` mode during inference → `BatchNorm` uses batch statistics instead of running statistics, and `Dropout` randomly zeros activations. Always call `model.eval()` before inference and `model.train()` before training.

---

## Architecture
- **[HIGH]** Model not implemented as an `nn.Module` subclass → `parameters()`, `state_dict()`, `to(device)`, and `train()`/`eval()` are unavailable. Subclass `nn.Module` and define all layers in `__init__` and forward pass in `forward()`.
- **[HIGH]** Training loop, model definition, and data loading all in a single script → not reusable or testable. Separate into `model.py`, `dataset.py`, `train.py`, and `evaluate.py` with clear interfaces.
- **[MEDIUM]** Custom data loading not using `torch.utils.data.Dataset` and `DataLoader` → non-reproducible shuffling, no multi-worker support, and no collation. Implement `__len__` and `__getitem__` in a `Dataset` subclass and wrap with `DataLoader`.
- **[MEDIUM]** Hyperparameters hardcoded as module-level constants → cannot run experiments without editing source. Use `argparse`, `hydra`, or a config YAML file for all hyperparameters.
- **[MEDIUM]** No checkpointing implemented → training not resumable after interruption. Save `model.state_dict()` and `optimizer.state_dict()` at regular intervals with `torch.save`.
- **[LOW]** Experiment not logged with TensorBoard or Weights & Biases → training dynamics invisible, hard to compare runs. Add metric logging with `torch.utils.tensorboard.SummaryWriter` or `wandb.log`.

---

## Code Quality
- **[HIGH]** `optimizer.zero_grad()` not called before `loss.backward()` → gradients accumulate across batches, producing incorrect parameter updates. Call `optimizer.zero_grad()` at the start of each training step (or use `set_to_none=True` for efficiency).
- **[HIGH]** Tensors on different devices (CPU vs CUDA) passed to the same operation → `RuntimeError: Expected all tensors to be on the same device`. Explicitly move all tensors to the target device before operations.
- **[MEDIUM]** Inference not wrapped in `torch.no_grad()` → autograd graph is built unnecessarily during inference, wasting memory and time. Wrap inference code in `with torch.no_grad():` or decorate with `@torch.inference_mode()`.
- **[MEDIUM]** Random seeds not set for reproducibility → experiments not reproducible across runs. Set `torch.manual_seed`, `torch.cuda.manual_seed_all`, `numpy.random.seed`, and `random.seed` at the entry point.
- **[MEDIUM]** Loss not reduced correctly for variable-length sequences (e.g., padding tokens included in mean) → biased gradient signal. Use `ignore_index` in `CrossEntropyLoss` or mask padding tokens before reducing.
- **[LOW]** Gradient norms not clipped during training → exploding gradients cause NaN loss. Add `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)` before `optimizer.step()`.

---

## Common Bugs & Pitfalls
- **[HIGH]** In-place operation on a leaf tensor that requires gradient (`tensor += 1`, `tensor.fill_()`) → autograd cannot track the in-place modification and raises a `RuntimeError`. Use out-of-place operations (`tensor = tensor + 1`) on tensors in the computation graph.
- **[HIGH]** `.numpy()` called on a tensor without `.detach()` first → raises `RuntimeError: Can't call numpy() on Tensor that requires grad`. Always call `.detach().cpu().numpy()` when converting to numpy.
- **[MEDIUM]** DataLoader `drop_last=False` with batch-dependent operations (e.g., `BatchNorm`) → final batch has a different size and causes shape mismatches or unstable normalisation. Set `drop_last=True` when the model requires fixed batch sizes.
- **[MEDIUM]** `model.train()` not called after evaluation → subsequent training runs use `BatchNorm` and `Dropout` in eval mode. Explicitly call `model.train()` after every validation phase.
- **[MEDIUM]** Tensor shape assumptions broken after dimension squeeze/unsqueeze → operations silently produce wrong-shaped outputs. Add `.shape` assertions at key points and use named dimensions or `einops` for clarity.
- **[LOW]** CUDA out-of-memory error not caught and handled gracefully → training script crashes with an unreadable CUDA error. Wrap forward/backward in a try/except for `torch.cuda.OutOfMemoryError` and reduce batch size dynamically.
