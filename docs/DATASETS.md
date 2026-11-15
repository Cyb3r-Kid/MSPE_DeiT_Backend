# Datasets

No ISIC files are bundled. Obtain the relevant 2016, 2017, 2018, 2019, 2020, and 2024 resources from the [ISIC Archive](https://www.isic-archive.com/) and check each release's access and license terms. Earlier dermoscopic images and 2024 3D-TBP crops have distinct modalities. Do not join records without a verified common patient and lesion identity.

Prepare a CSV with `image_path,patient_id,label,modality,source,age,sex,anatomical_location`. `label` is 0 or 1; `modality` is `dermoscopic` or `tbp_3d`. Missing optional fields stay missing. Paths must refer to files on disk. Run:

```powershell
py -3.12 -m ml.datasets.manifest datasets\raw_manifest.csv datasets\split_manifest.csv
```

The manifest command verifies files, hashes images, rejects cross-patient duplicates, and makes patient-isolated approximately 60/20/20 folds. Exact class balance and split ratios may not be feasible on small or skewed groups. Inspect split counts and provenance before training. The command does not download large datasets automatically.

Run `py -3.12 -m ml.datasets.inspect datasets\split_manifest.csv` for class, source, modality, duplicate, and missing-field summaries plus a class-distribution plot.
