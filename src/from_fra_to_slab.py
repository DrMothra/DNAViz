#  File: from_fra_to_slab.py
#
#  Copyright (C) 2017 Marco Pasi <mf.pasi@gmail.com>
#
#  This program is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 2 of the License, or
#  (at your option) any later version.
# "from_fra_to_slab.py v0.1 (C) 2017 Marco Pasi"
#
# Operations to go from the Curves+ .fra output to the vertices of
# base slabs.
#
import numpy as np

_a = np.array

# 1) Read fra format into structures "o" (points) and "q" (rotation matrices)
frames = np.loadtxt("input.fra")
nbp = frames.shape[0]/2
o = np.reshape(frames[:, 11:14]/1000.0, (2, nbp, 3))  # (strand, level, dim)
q = np.transpose(np.reshape(frames[:, 2:11]/1000.0,  (2, nbp, 3, 3)),
                 (0, 1, 3, 2))  # (strand, level, dim1, dim2)


# 2) Build slab vertices from point (point) and rotation matrix (R)
def slab_vertices(point, R, length=[1, 1, 1], center=[0, 0, 0]):
    e1, e2, e3 = np.eye(3)
    l = _a(length)  # transform list to numpy array
    c = _a(center)
    o = point - np.dot(R, l*c/2)
    # Define slab vertices:
    #
    #     g      h
    #     .______.
    #    /      /|
    # e/______/f |
    #  |      |  |d
    #  |  c   | /
    #  |______|/
    #  a      b
    #
    a = o
    b = o + np.dot(R, l*e3)
    c = o + np.dot(R, l*e2)
    d = o + np.dot(R, l*(e2+e3))
    e = o + np.dot(R, l*e1)
    f = o + np.dot(R, l*(e1+e3))
    g = o + np.dot(R, l*(e1+e2))
    h = o + np.dot(R, l)
    return (a, b, c, d, e, f, g, h)


# 3) Print out slab vertices
for i in range(nbp):            # level
    for k in range(2):          # strand
        # ----------------
        o_strand = o[k, i, :]
        q_strand = q[k, i, :, :]
        print slab_vertices(o_strand, q_strand,
                            length=[5, 5, .25], center=[1, 0, 0])
